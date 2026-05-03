#!/usr/bin/env python3


import os
import sys
import json
import signal
from collections import deque
from typing import Optional
from urllib.parse import urlparse, parse_qs

import requests
import typer
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.live import Live
from rich.layout import Layout
from rich.text import Text

app = typer.Typer(
    help="Aerial Vision Mission Control CLI",
    no_args_is_help=True,
    add_completion=False,
)
stream_app = typer.Typer(help="Manage active inference streams")
app.add_typer(stream_app, name="stream")
console = Console()



def resolve_host(ctx: typer.Context) -> str:
    """Return the effective backend base URL."""
    override = ctx.obj.get("host_override")
    if override:
        return override.rstrip("/")
    return os.getenv("AERIAL_HOST", "http://localhost:8000").rstrip("/")


def _build_url(ctx: typer.Context, path: str) -> str:
    """Turn a path or full URL into an absolute request URL."""
    if path.startswith("http://") or path.startswith("https://"):
        return path
    base = resolve_host(ctx)
    if not path.startswith("/"):
        path = "/" + path
    return base + path


def call_api(ctx: typer.Context, method: str, path: str, **kwargs):
    """
    Central HTTP wrapper.
    Catches ConnectionError / Timeout and renders clean Rich Panels
    instead of dumping Python tracebacks.
    """
    url = _build_url(ctx, path)
    
    timeout = kwargs.pop("timeout", 30)
    try:
        return requests.request(method, url, timeout=timeout, **kwargs)
    except requests.exceptions.ConnectionError as exc:
        console.print(Panel(
            f"[bold red]Remote Aerial Vision server at[/] "
            f"[yellow]{resolve_host(ctx)}[/] [bold red]is unreachable.[/]\n\n"
            f"Check your network connection, VPN, or ensure the target IP is correct.\n\n"
            f"[dim]{exc}[/dim]",
            title="Aerial Vision — Connection Error",
            border_style="red",
        ))
        raise typer.Exit(code=1)
    except requests.exceptions.Timeout:
        console.print(Panel(
            "[bold red]Request timed out.[/]\n\n"
            "The remote GPU may be under heavy load or the network is slow.",
            title="Aerial Vision — Timeout",
            border_style="red",
        ))
        raise typer.Exit(code=1)


def handle_http_error(resp: requests.Response):
    """If the response is non-2xx, print a clean error panel and exit."""
    if resp.ok:
        return
    detail = ""
    try:
        data = resp.json()
        if isinstance(data, dict):
            detail = data.get("detail") or data.get("message") or json.dumps(data)
        else:
            detail = str(data)
    except Exception:
        detail = resp.text or f"HTTP {resp.status_code}"
    console.print(Panel(
        f"[bold red]Server returned an error.[/]\n\n"
        f"Status: [yellow]{resp.status_code}[/]\n"
        f"Detail: {detail}",
        title="Aerial Vision — Server Error",
        border_style="red",
    ))
    raise typer.Exit(code=1)




@app.callback()
def main(
    ctx: typer.Context,
    host: Optional[str] = typer.Option(
        None,
        "--host",
        help="Override AERIAL_HOST environment variable.",
    ),
):
    ctx.ensure_object(dict)
    ctx.obj["host_override"] = host




@app.command()
def status(ctx: typer.Context):
    """Fetch system health, active model, stream counts, and GPU VRAM."""
    root_resp = call_api(ctx, "GET", "/")
    handle_http_error(root_resp)
    data = root_resp.json()

    streams_resp = call_api(ctx, "GET", "/streams/status")
    handle_http_error(streams_resp)
    streams_data = streams_resp.json()

   
    table = Table(
        title="Aerial Vision GPU Engine Status",
        show_header=True,
        header_style="bold magenta",
    )
    table.add_column("Metric", style="cyan")
    table.add_column("Value", style="green")

    table.add_row("Engine", data.get("engine", "N/A"))
    table.add_row("Status", data.get("status", "N/A"))
    table.add_row("Active Model", data.get("model_loaded", "none"))
    table.add_row("Redis", data.get("redis", "unknown"))
    table.add_row(
        "Active Streams",
        f"{streams_data.get('active', 0)} / {streams_data.get('max', 0)}",
    )
    table.add_row(
        "Inference Resolution",
        str(data.get("inference_resolution", "N/A")),
    )
    table.add_row(
        "Stream Resolution",
        str(data.get("stream_resolution", "N/A")),
    )

    gpu = data.get("gpu", {})
    if gpu and gpu.get("device") != "cpu":
        vram_alloc = gpu.get("vram_allocated_gb", 0)
        vram_total = gpu.get("vram_total_gb", 1)
        vram_pct = (vram_alloc / vram_total * 100) if vram_total else 0

        if vram_alloc >= 14:
            color = "red"
        elif vram_pct > 75:
            color = "yellow"
        else:
            color = "green"

        table.add_row("GPU Device", gpu.get("device", "N/A"))
        table.add_row(
            "VRAM Allocated",
            f"[{color}]{vram_alloc} GB / {vram_total} GB ({vram_pct:.1f}%)[/{color}]",
        )
        table.add_row("VRAM Reserved", f"{gpu.get('vram_reserved_gb', 0)} GB")
    else:
        table.add_row("GPU", "[yellow]CPU Mode[/]")

    console.print(table)

   
    active_streams = streams_data.get("streams", {})
    if active_streams:
        st = Table(
            title="Active Streams",
            show_header=True,
            header_style="bold blue",
        )
        st.add_column("Stream ID", style="cyan")
        st.add_column("Model", style="green")
        st.add_column("Source", style="dim")
        st.add_column("Uptime (s)", justify="right")
        st.add_column("Inference (ms)", justify="right")
        st.add_column("Reconnects", justify="right")

        for sid, info in active_streams.items():
            health = info.get("health", {})
            st.add_row(
                sid,
                info.get("model", "N/A"),
                (info.get("source", "N/A") or "")[:40],
                str(info.get("uptime_s", 0)),
                str(health.get("inference_ms", 0)),
                str(health.get("reconnect_count", 0)),
            )
        console.print(st)
    else:
        console.print(Panel("[dim]No active streams.[/]", border_style="dim"))




@app.command()
def probe(
    ctx: typer.Context,
    url: str = typer.Argument(..., help="Video source URL to probe."),
):
    """Analyze a source URL and recommend a model configuration."""
    with console.status("[bold green]Probing remote source...", spinner="dots"):
        resp = call_api(ctx, "POST", "/probe", json={"sourceUrl": url})
    handle_http_error(resp)
    data = resp.json()

    table = Table(title="Probe Result", show_header=False)
    table.add_column("Field", style="cyan")
    table.add_column("Value", style="green")
    table.add_row("View Type", data.get("viewType", "N/A"))
    table.add_row("Recommended Model", data.get("recommended_model", "N/A"))
    table.add_row("Locked", "Yes" if data.get("is_locked") else "No")
    table.add_row("Reason", data.get("reason", "N/A"))
    console.print(table)




@app.command(name="list")
def simulations_list(ctx: typer.Context):
    """List available simulation assets on the remote GPU."""
    resp = call_api(ctx, "GET", "/simulations/list")
    handle_http_error(resp)
    data = resp.json()

    scenarios = data.get("scenarios", [])
    if not scenarios:
        console.print(
            Panel("[dim]No simulations found on remote server.[/]", border_style="dim")
        )
        return

    table = Table(
        title="Available Simulations",
        show_header=True,
        header_style="bold magenta",
    )
    table.add_column("ID", style="cyan")
    table.add_column("Name", style="green")
    for s in scenarios:
        table.add_row(s.get("id", "N/A"), s.get("name", "N/A"))
    console.print(table)




def _consume_telemetry(
    ctx: typer.Context,
    telemetry_url: str,
    video_id_for_cancel: Optional[str] = None,
):
    """
    Consume an NDJSON telemetry stream and render a live Rich dashboard.
    Ignores base64 image payloads.  Ctrl+C gracefully cancels the remote job.
    """
    if telemetry_url.startswith("/"):
        telemetry_url = _build_url(ctx, telemetry_url)

    console.print(
        Panel(
            f"[bold green]Starting telemetry stream...[/]\n[dim]{telemetry_url}[/]",
            border_style="green",
        )
    )

    incidents = deque(maxlen=5)
    frame_stats = {
        "frame": 0,
        "count": 0,
        "status": "N/A",
        "avg_speed": 0.0,
        "density": 0.0,
    }
    cancelled = False

    def make_layout() -> Layout:
        layout = Layout()

        
        stats_text = Text()
        stats_text.append("Frame: ", style="cyan")
        stats_text.append(f"{frame_stats['frame']}  ", style="bold white")
        stats_text.append("Count: ", style="cyan")
        stats_text.append(f"{frame_stats['count']}  ", style="bold white")
        stats_text.append("Status: ", style="cyan")
        status = str(frame_stats['status'])
        if "CLEAR" in status:
            status_color = "green"
        elif "MODERATE" in status or "BUILDING" in status or "DISSIPATING" in status:
            status_color = "yellow"
        else:
            status_color = "red"
        stats_text.append(f"{status}  ", style=f"bold {status_color}")
        stats_text.append("Avg Speed: ", style="cyan")
        stats_text.append(f"{frame_stats['avg_speed']} km/h  ", style="bold white")
        stats_text.append("Density: ", style="cyan")
        stats_text.append(f"{frame_stats['density']}", style="bold white")

        top = Panel(stats_text, title="Telemetry", border_style="blue")

       
        if incidents:
            it = Table(show_header=True, header_style="bold red")
            it.add_column("Type", style="yellow")
            it.add_column("Severity", style="red")
            it.add_column("Description", style="white")
            for inc in incidents:
                it.add_row(
                    inc.get("type", "N/A"),
                    inc.get("severity", "N/A"),
                    (inc.get("description", "N/A") or "")[:60],
                )
            bottom = Panel(it, title="Recent Incidents", border_style="red")
        else:
            bottom = Panel(
                "[dim]No incidents detected.[/]",
                title="Recent Incidents",
                border_style="dim",
            )

        layout.split_column(
            Layout(top, name="stats", size=5),
            Layout(bottom, name="incidents"),
        )
        return layout

    try:
        with Live(make_layout(), console=console, refresh_per_second=4, screen=False) as live:
           
            resp = call_api(ctx, "GET", telemetry_url, timeout=(10, None), stream=True)
            handle_http_error(resp)

            for line in resp.iter_lines():
                if not line:
                    continue
                try:
                    payload = json.loads(line.decode("utf-8"))
                except Exception:
                    continue

                if payload.get("error"):
                    console.print(
                        Panel(
                            f"[red]Stream Error:[/] {payload['error']}",
                            border_style="red",
                        )
                    )
                    break

                stats = payload.get("stats", {})
                frame_stats["frame"] = payload.get("frame", frame_stats["frame"])
                frame_stats["count"] = stats.get("count", frame_stats["count"])
                frame_stats["status"] = stats.get("status", frame_stats["status"])
                frame_stats["avg_speed"] = stats.get(
                    "avg_speed", frame_stats["avg_speed"]
                )
                frame_stats["density"] = stats.get("density", frame_stats["density"])

                for inc in payload.get("incidents", []):
                    incidents.append(inc)

                live.update(make_layout())

    except KeyboardInterrupt:
        cancelled = True
        console.print()
        if video_id_for_cancel:
            try:
                cancel_resp = call_api(
                    ctx,
                    "POST",
                    "/cancel-telemetry",
                    json={"video_id": video_id_for_cancel},
                    timeout=10,
                )
                if cancel_resp.ok:
                    console.print(
                        Panel(
                            "[bold yellow]Cancellation signal sent to remote GPU.[/]",
                            border_style="yellow",
                        )
                    )
                else:
                    console.print(
                        Panel(
                            "[bold yellow]Stream stopped locally.[/]",
                            border_style="yellow",
                        )
                    )
            except Exception:
                console.print(
                    Panel(
                        "[bold yellow]Stream stopped locally.[/]",
                        border_style="yellow",
                    )
                )
        else:
            console.print(
                Panel(
                    "[bold yellow]Stream stopped by user.[/]",
                    border_style="yellow",
                )
            )
        raise typer.Exit(code=0)

    if not cancelled:
        console.print(
            Panel("[bold green]Telemetry stream complete.[/]", border_style="green")
        )



@app.command(name="run")
def simulation_run(
    ctx: typer.Context,
    simulation_id: str = typer.Argument(..., help="ID of the simulation to run."),
    model: str = typer.Option("mark-5", "--model", help="Model to use for inference."),
):
    """Run a remote simulation and consume its telemetry stream."""
    with console.status("[bold green]Requesting simulation job...", spinner="dots"):
        resp = call_api(
            ctx,
            "POST",
            "/process-local-simulation",
            json={"simulation_id": simulation_id, "model": model},
        )
    handle_http_error(resp)
    data = resp.json()

    stream_url = data.get("stream_url")
    if not stream_url:
        console.print(
            Panel(
                "[red]Server did not return a telemetry stream URL.[/]",
                border_style="red",
            )
        )
        raise typer.Exit(code=1)

    parsed = urlparse(stream_url)
    qs = parse_qs(parsed.query)
    video_id = qs.get("video_id", [None])[0]

    _consume_telemetry(ctx, stream_url, video_id_for_cancel=video_id)



@app.command()
def upload(
    ctx: typer.Context,
    file_path: str = typer.Argument(..., help="Path to local video file to upload."),
    model: str = typer.Option("mark-5", "--model", help="Model to use for inference."),
):
    """Upload a local video to the remote GPU and consume its telemetry stream."""
    if not os.path.exists(file_path):
        console.print(
            Panel(f"[red]File not found:[/] {file_path}", border_style="red")
        )
        raise typer.Exit(code=1)

    with console.status(
        f"[bold green]Uploading {os.path.basename(file_path)}...", spinner="dots"
    ):
        with open(file_path, "rb") as f:
            files = {"file": (os.path.basename(file_path), f, "video/mp4")}
            data = {"model": model}
            resp = call_api(
                ctx, "POST", "/upload_and_process", files=files, data=data, timeout=300
            )
    handle_http_error(resp)
    data = resp.json()

    stream_url = data.get("stream_url")
    if not stream_url:
        console.print(
            Panel(
                "[red]Server did not return a telemetry stream URL.[/]",
                border_style="red",
            )
        )
        raise typer.Exit(code=1)

    parsed = urlparse(stream_url)
    qs = parse_qs(parsed.query)
    video_id = qs.get("video_id", [None])[0]

    _consume_telemetry(ctx, stream_url, video_id_for_cancel=video_id)




@stream_app.command("start")
def stream_start(
    ctx: typer.Context,
    stream_id: str = typer.Argument(..., help="Unique ID for the stream."),
    url: str = typer.Argument(..., help="Video source URL."),
    model: str = typer.Option("mark-5", "--model", help="Model variant to load."),
):
    """Deploy a stream to the remote GPU engine."""
    with console.status("[bold green]Deploying stream to remote GPU...", spinner="dots"):
        resp = call_api(
            ctx,
            "POST",
            "/streams/start",
            json={"id": stream_id, "sourceUrl": url, "model": model},
        )
    handle_http_error(resp)
    data = resp.json()

    console.print(
        Panel(
            f"[bold green]Stream deployed successfully.[/]\n\n"
            f"Stream ID: [cyan]{data.get('streamId')}[/]\n"
            f"Status: [green]{data.get('status')}[/]\n"
            f"Model: [yellow]{data.get('model')}[/]\n"
            f"Stream URL: [dim]{data.get('aiEngineUrl')}[/]",
            title="Aerial Vision — Stream Started",
            border_style="green",
        )
    )



@stream_app.command("stop")
def stream_stop(
    ctx: typer.Context,
    stream_id: str = typer.Argument(..., help="ID of the stream to stop."),
):
    """Kill a remote stream to free up VRAM."""
    resp = call_api(ctx, "POST", f"/streams/{stream_id}/stop")
    try:
        data = resp.json()
    except Exception:
        handle_http_error(resp)
        return

    if data.get("success"):
        console.print(
            Panel(
                f"[bold green]Stream stopped successfully.[/]\n\n"
                f"Stream ID: [cyan]{data.get('streamId', stream_id)}[/]",
                title="Aerial Vision — Stream Stopped",
                border_style="green",
            )
        )
    else:
        console.print(
            Panel(
                f"[bold yellow]Could not stop stream.[/]\n\n"
                f"Stream ID: [cyan]{stream_id}[/]\n"
                f"Reason: {data.get('message', 'Unknown error')}",
                title="Aerial Vision — Warning",
                border_style="yellow",
            )
        )




if __name__ == "__main__":
    app()

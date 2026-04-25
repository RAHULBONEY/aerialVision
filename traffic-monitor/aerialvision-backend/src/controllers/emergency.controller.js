const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const routeService = require('../services/route.service');
const polylineService = require('../services/polyline.service');
const imageryService = require('../services/imagery.service');
const tileCacheService = require('../services/tileCache.service');
const tileQueueService = require('../services/tileQueue.service');
const auditLogsService = require("../services/auditLogs.service");
const ragService = require('../services/rag.service');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore'); 

exports.computeRoutes = async (req, res) => {
    try {
        const { origin, destination, options = {} } = req.body;
        
        if (!origin || !destination) {
            return res.status(400).json({ success: false, error: 'origin and destination are required' });
        }

        const sessionId = uuidv4();
        const zoomLevel = 19;
        const samplingInterval = options.samplingIntervalMeters || 30;

        const routes = await routeService.computeEmergencyRoutes(origin, destination, options);

        if (!routes.length) {
            return res.status(404).json({ success: false, error: 'No routes found' });
        }

        const primaryRoute = routes[0];
        
        primaryRoute.sampledCoords = polylineService.resamplePolyline(primaryRoute.encodedPolyline, samplingInterval);

        const requiredTiles = imageryService.generateTileGrid(primaryRoute.sampledCoords, zoomLevel);

        const requiredTileIds = requiredTiles.map(t => t.tileId);
        const existingTileIds = await tileCacheService.checkExistingTiles(requiredTileIds);
        
        const existingSet = new Set(existingTileIds);
        const tilesReady = [];
        const tilesPending = [];

        for (const tile of requiredTiles) {
            tile.proxyUrl = `/api/emergency/tiles/${tile.tileId}`;
            if (existingSet.has(tile.tileId)) {
                tile.status = 'cached';
                tilesReady.push(tile);
            } else {
                tile.status = 'fetching';
                tilesPending.push(tile);
            }
        }

        if (tilesPending.length > 0) {
            await tileQueueService.enqueueTiles(tilesPending, sessionId);
        }

        const db = getFirestore();
        const sessionRef = db.collection('routeSessions').doc(sessionId);
        
        const sessionData = {
            sessionId,
            createdAt: new Date().toISOString(),
            status: tilesPending.length === 0 ? 'ready' : 'processing',
            origin,
            destination,
            routes,
            tiles: [...tilesReady, ...tilesPending],
            metadata: {
                totalDistanceKm: primaryRoute.distanceMeters / 1000,
                totalTiles: requiredTiles.length,
                cachedTiles: tilesReady.length,
                fetchedTiles: tilesPending.length
            }
        };

        sessionRef.set(sessionData)
            .then(async () => {
                const originLabel = origin.label || origin.name || 'Unknown Location';
                const destinationLabel = destination.label || destination.name || 'Unknown Location';
                const durationMinutes = Math.round((routes[0]?.durationSeconds || 0) / 60);
                const ragContent = `On ${sessionData.createdAt}, an emergency routing session (ID: ${sessionId}) was generated from '${originLabel}' to '${destinationLabel}'. The primary route covers ${sessionData.metadata.totalDistanceKm} km with an estimated driving time of ${durationMinutes} minutes. The status is ${sessionData.status} and it required analyzing ${sessionData.metadata.totalTiles} satellite tiles.`;

                try {
                    const embeddingArray = await ragService.getEmbedding(ragContent);
                    await sessionRef.update({
                        ragContent,
                        embedding: admin.firestore.FieldValue.vector(embeddingArray)
                    });
                } catch (err) {
                    console.error('Route session RAG embedding failed:', err.message);
                    await sessionRef.update({
                        ragContent,
                        ragStatus: 'EMBEDDING_FAILED'
                    }).catch(() => {});
                }
            })
            .catch(console.error);

        // Audit log action
        if (req.user) {
          auditLogsService.logAction({
            action: "EMERGENCY_COMPUTE_ROUTE",
            category: "EMERGENCY",
            performedBy: req.user,
            targetId: sessionId,
            targetName: `${origin?.name || "Origin"} to ${destination?.name || "Destination"}`,
            details: sessionData.metadata
          });
        }

        return res.status(200).json({
            success: true,
            sessionId,
            routes,
            tiles: {
                ready: tilesReady,
                pending: tilesPending.length,
                total: requiredTiles.length,
                all: requiredTiles  // Full list with tileIds for AI analysis
            },
            pollUrl: `/api/emergency/routes/${sessionId}/tiles`
        });

    } catch (error) {
        console.error('Error in computeRoutes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.pollTiles = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const db = getFirestore();
        const doc = await db.collection('routeSessions').doc(sessionId).get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }

        const data = doc.data();
        
        let fetchedSince = 0;
        const remainingTiles = data.tiles.filter(t => t.status === 'fetching');
        const pendingIds = remainingTiles.map(t => t.tileId);
        const nowCachedIds = await tileCacheService.checkExistingTiles(pendingIds);
        
        return res.status(200).json({ 
            success: true, 
            sessionId, 
            status: nowCachedIds.length === pendingIds.length ? 'ready' : 'processing',
            tiles: {
                newlyReady: nowCachedIds.length,
                stillPending: pendingIds.length - nowCachedIds.length,
                total: data.tiles.length
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.serveTile = async (req, res) => {
    try {
        const { tileId } = req.params;
        const imageBuffer = await tileCacheService.getTile(tileId);

        if (!imageBuffer) {
            // Tile might still be fetching or failed
            return res.status(202).json({ success: false, message: 'Tile not ready yet' });
        }

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=7200');
        return res.end(imageBuffer, 'binary');

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const db = getFirestore();
        await db.collection('routeSessions').doc(sessionId).delete().catch(()=>null);
        res.status(200).json({ success: true, message: "Session removed" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.analyzeRoute = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { tileIds, model } = req.body;

        if (!tileIds || !tileIds.length) {
            return res.status(400).json({ success: false, error: 'tileIds array is required' });
        }

        const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'https://aerialvision.onrender.com';

        console.log(`🧠 Forwarding ${tileIds.length} tiles to AI Engine for analysis...`);

        const { data } = await axios.post(`${AI_ENGINE_URL}/analyze`, {
            sessionId,
            tileIds,
            model: model || 'mark-5'
        }, {
            timeout: 120000
        });

        if (req.user) {
          auditLogsService.logAction({
            action: "EMERGENCY_ANALYZE_ROUTE",
            category: "EMERGENCY",
            performedBy: req.user,
            targetId: sessionId,
            targetName: `AI Analysis (Model: ${model || 'mark-5'})`,
            details: { tileCount: tileIds.length }
          });
        }

        return res.status(200).json({
            success: true,
            sessionId,
            analysis: data
        });

    } catch (error) {
        console.error('Error in analyzeRoute:', error?.response?.data || error.message);
        res.status(500).json({ 
            success: false, 
            error: error?.response?.data?.error || error.message 
        });
    }
};

exports.getRouteHistory = async (req, res) => {
    try {
        const db = getFirestore();
        const snapshot = await db.collection('routeSessions')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();

        const history = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            history.push({
                sessionId: doc.id,
                createdAt: data.createdAt,
                origin: data.origin,
                destination: data.destination,
                metadata: data.metadata,
                routes: data.routes
            });
        });

        return res.status(200).json({
            success: true,
            history
        });
    } catch (error) {
        console.error('Error in getRouteHistory:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

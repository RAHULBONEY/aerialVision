
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const analyzeSourceUrl = async ({ sourceUrl, requestedModel,token }) => {
  const response = await fetch(`${API_URL}/api/config/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
     },
    body: JSON.stringify({ sourceUrl, requestedModel }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Analysis failed");
  }
  return response.json();
};

export const fetchConfigDashboard = async (token) => {
  const response = await fetch(`${API_URL}/api/config/dashboard`,{
    headers: { 
      "Authorization": `Bearer ${token}` 
    }
  });
  if (!response.ok) throw new Error("Failed to fetch dashboard config");
  return response.json();
};
export const updateGovernancePolicy = async ({ token, ...policy }) => {
  

  const response = await fetch(`${API_URL}/api/config/update`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(policy),
  });

  const json = await response.json();
  

  if (!response.ok) throw new Error(json.message || "Update failed");
  return json;
};

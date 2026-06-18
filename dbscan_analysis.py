import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN

# 1. Convert n8n incoming data directly to a Pandas DataFrame
elements = _input.all()[0].json.get('elements', [])
df = pd.DataFrame(elements)

# Extract names safely from the nested OSM tags
df['name'] = df['tags'].apply(lambda x: x.get('name', 'Unknown') if isinstance(x, dict) else 'Unknown')

# 2. Convert Lat/Lon to radians for Haversine
coords = np.radians(df[['lat', 'lon']].values)

# 3. Run DBSCAN (100 meters radius, minimum 5 points)
kms_per_radian = 6371.0088
epsilon = 0.1 / kms_per_radian 

db = DBSCAN(eps=epsilon, min_samples=5, metric='haversine').fit(coords)
df['cluster'] = db.labels_

# 4. Filter only anomalies (noise points labeled as -1)
anomalies_df = df[df['cluster'] == -1]

# 5. Return a clean list of dictionaries back to n8n
anomalies = anomalies_df[['id', 'lat', 'lon', 'name']].to_dict(orient='records')

return {
    "anomalies_detected": len(anomalies) > 0,
    "anomaly_count": len(anomalies),
    "anomalies": anomalies
}
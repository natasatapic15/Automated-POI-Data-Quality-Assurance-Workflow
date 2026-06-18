import sys
import json
import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN


def detect_anomalies(payload: dict) -> dict:
    elements = payload.get("elements", [])
    df = pd.DataFrame(elements)

    if df.empty:
        return {"anomalies_detected": False, "anomaly_count": 0, "anomalies": []}

    # Ways from Overpass carry coordinates under "center"; nodes use lat/lon.
    if "center" in df.columns:
        df["lat"] = df["lat"].fillna(df["center"].apply(
            lambda c: c.get("lat") if isinstance(c, dict) else None))
        df["lon"] = df["lon"].fillna(df["center"].apply(
            lambda c: c.get("lon") if isinstance(c, dict) else None))

    df["name"] = df["tags"].apply(
        lambda x: x.get("name", "Unknown") if isinstance(x, dict) else "Unknown")

    df = df.dropna(subset=["lat", "lon"])

    coords = np.radians(df[["lat", "lon"]].values)

    kms_per_radian = 6371.0088
    epsilon = 0.1 / kms_per_radian

    db = DBSCAN(eps=epsilon, min_samples=5, metric="haversine").fit(coords)
    df["cluster"] = db.labels_

    anomalies_df = df[df["cluster"] == -1]
    anomalies = anomalies_df[["id", "lat", "lon", "name"]].to_dict(orient="records")

    return {
        "total_pois": int(len(df)),
        "anomalies_detected": len(anomalies) > 0,
        "anomaly_count": len(anomalies),
        "anomalies": anomalies,
    }


if __name__ == "__main__":
    raw = sys.stdin.read()
    payload = json.loads(raw) if raw.strip() else {"elements": []}
    result = detect_anomalies(payload)
    print(json.dumps(result, ensure_ascii=False, indent=2))

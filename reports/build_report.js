const d = $input.first().json;
const date = (d.run_date || new Date().toISOString()).slice(0, 10);
const sample = (d.anomalies || []).slice(0, 25);

let table = '';
if (sample.length) {
  table += '| ID | Name | Lat | Lon |\n|---|---|---|---|\n';
  for (const a of sample) {
    table += '| ' + a.id + ' | ' + (a.name || 'Unknown') + ' | ' + a.lat.toFixed(6) + ' | ' + a.lon.toFixed(6) + ' |\n';
  }
} else {
  table = '_No spatial anomalies detected this run._\n';
}

const markdown =
'# POI Data Quality Report — NYC Restaurants\n\n' +
'**Run date:** ' + date + '\n\n' +
'**Total POIs analyzed:** ' + d.total_pois + '\n\n' +
'**Spatial anomalies (DBSCAN noise, eps=100m, minPts=5):** ' + d.anomaly_count + '\n\n' +
'## Anomalies' + (d.anomaly_count > 25 ? ' (showing first 25 of ' + d.anomaly_count + ')' : '') + '\n\n' +
table;

const slackText =
':round_pushpin: *POI Data Quality — NYC Restaurants* (' + date + ')\n' +
'• Total POIs analyzed: *' + d.total_pois + '*\n' +
'• Spatial anomalies detected: *' + d.anomaly_count + '*\n' +
(d.anomaly_count > 0
  ? '• Top examples: ' + sample.slice(0, 5).map((a) => a.name + ' (' + a.id + ')').join(', ')
  : '• No anomalies this run :white_check_mark:');

return [{
  json: {
    markdown,
    slackText,
    anomaly_count: d.anomaly_count,
    total_pois: d.total_pois,
    date,
  },
}];

overpass-query.overpassql
[out:json][timeout:180];

// 1. Locate the boundary area for New York City
area["wikidata"="Q60"]->.nyc;

// 2. Gather all restaurant nodes and ways inside that area
(
  node(area.nyc)["amenity"="restaurant"];
  way(area.nyc)["amenity"="restaurant"];
);

// 3. Output the results with center coordinates for map areas
out center;

from replit import db
import json

# Export all data
data = {key: db[key] for key in db.keys()}

# Save to file
with open("db_export.json", "w") as f:
    json.dump(data, f, indent=4)

print("Database exported to db_export.json")
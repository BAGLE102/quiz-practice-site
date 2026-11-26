"""Stage only public website assets; exclude original PDFs and working files."""
import argparse,json,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument("--output",type=Path,default=ROOT/".local/site")
args=parser.parse_args()
destination=args.output.resolve()
if not destination.is_relative_to(ROOT) or destination==ROOT:
    raise ValueError("Output must be a dedicated subdirectory inside this project")
if destination.exists() and any(destination.iterdir()):
    raise ValueError("Output must be empty; choose a new output directory")
destination.mkdir(parents=True,exist_ok=True)
for name in ["index.html",".nojekyll"]:
    shutil.copy2(ROOT/name,destination/name)
shutil.copytree(ROOT/"assets",destination/"assets",dirs_exist_ok=True)
(destination/"data/questions").mkdir(parents=True,exist_ok=True)
catalog=json.loads((ROOT/"data/catalog.json").read_text(encoding="utf8"))
shutil.copy2(ROOT/"data/catalog.json",destination/"data/catalog.json")
for bank in catalog["banks"]:
    path=Path(bank["path"])
    if path.is_absolute() or ".." in path.parts or path.parts[0]!="questions":
        raise ValueError("Invalid bank path")
    shutil.copy2(ROOT/"data"/path,destination/"data"/path)
assert not (destination/"pdf").exists()
assert not (destination/".git").exists()
print("Website staged:",destination)


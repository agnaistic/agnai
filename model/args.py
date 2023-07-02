import argparse

parser = argparse.ArgumentParser(
    prog="Agnaistic pipeline API",
    description="Pipeline features for improving Agnaistic conversations",
)

parser.add_argument(
    "-m", "--memory", action="store_true", help="Enable long-term memory using ChromaDB"
)
parser.add_argument(
    "-s", "--summary", action="store_true", help="Enable chat summarization"
)
parser.add_argument(
    "-a", "--all", action="store_true", help="Enable all pipeline features"
)

args, unknown = parser.parse_known_args()

if args.all is True:
    args.memory = True
    args.summarizer = True

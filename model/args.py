import argparse

parser = argparse.ArgumentParser(
    prog="Agnaistic pipeline API",
    description="Pipeline features for improving Agnaistic conversations",
)

parser.add_argument("--memory", "Enable long-term memory using ChromaDB")
parser.add_argument("--summary", "Enable chat summarization")
parser.add_argument("--all", "Enable all pipeline features")

args = parser.parse_args()

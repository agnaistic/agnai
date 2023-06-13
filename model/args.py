import argparse

parser = argparse.ArgumentParser(
    prog="Agnaistic pipeline API",
    description="Pipeline features for improving Agnaistic conversations",
)

parser.add_argument("-m", "--memory", help="Enable long-term memory using ChromaDB")
parser.add_argument("-s", "--summary", help="Enable chat summarization")
parser.add_argument("-a", "--all", help="Enable all pipeline features")

args = parser.parse_args()

if args.all is True:
    args.memory = True
    args.summarizer = True

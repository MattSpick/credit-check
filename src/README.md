# CRediT Check

**A free tool to assess CRediT Author Contributions in scientific publications.**

Developed by the [Metascience Expert Group](https://www.surrey.ac.uk), University of Surrey.

---

## What is CRediT?

The [Contributor Roles Taxonomy (CRediT)](https://credit.niso.org/) is a standardised vocabulary for describing the specific contributions of authors in scientific publications. It covers 14 roles including Conceptualization, Methodology, Writing, and more.

CRediT Check parses the author list and CRediT contribution statement from a published paper and generates a clear table showing who did what — making it easy to spot omissions or inconsistencies.

## Features

- Parses all three common CRediT statement formats automatically:
  - **Role-first with colon:** `Conceptualization: J.S., M.G.`
  - **Role-first with comma:** `Conceptualization, J.S., M.G.; Methodology, J.S.`
  - **Author-first:** `J.S.: Conceptualization, Methodology.`
- Handles full names, initials, and name particles (von, van, de, etc.)
- Strips credentials (MD, PhD, MBBS) and affiliation codes automatically
- US and UK spelling supported (e.g. Visuali**z**ation / Visuali**s**ation)
- Highlights roles with no contributors and roles with 4+ contributors
- Shows total contributors per role and roles per author
- Copy to clipboard for pasting into Word or Excel

## Usage

1. Paste the author list from the paper
2. Paste the CRediT contribution statement
3. Click **Generate Table**

## Feedback

Errors and feedback can be sent to **Matt Spick** at the University of Surrey's Metascience expert group: [matt.spick@surrey.ac.uk](mailto:matt.spick@surrey.ac.uk)

## Technical notes

Built with React and Vite. No data is sent to any server — all parsing happens locally in your browser. Free to use, free to host.

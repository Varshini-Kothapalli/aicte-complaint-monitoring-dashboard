"""Clean, redact, classify and provenance-label the ACSS dataset.
Usage: python3 -I clean_acss.py <ACSSv1.xlsx> <out_dir>
"""
import sys, re, hashlib, datetime as dt
import pandas as pd, openpyxl

SRC, OUT = sys.argv[1], sys.argv[2]
DOI = "https://doi.org/10.7910/DVN/EITGBB"

# ---------- load with raw cell types (to know which dates were text) ----------
wb = openpyxl.load_workbook(SRC, read_only=True)
ws = wb.active
rows = [r for r in ws.iter_rows(min_row=2, values_only=True) if any(v is not None for v in r)]
cols = ["module", "nature", "subject", "description", "char_count", "type", "created_raw"]
df = pd.DataFrame(rows, columns=cols)
df.insert(0, "source_row", range(2, len(df) + 2))          # Excel row number in ACSSv1.xlsx
n_raw = len(df)


def parse_date(v):
    if isinstance(v, dt.datetime):
        # Excel parsed it. If day<=12 it *may* be a swapped DD-MM value (see quality report).
        return v, ("medium" if v.day <= 12 else "high")
    if isinstance(v, str):
        return dt.datetime.strptime(v.strip(), "%d-%m-%Y %H:%M:%S"), "high"
    return None, "missing"


parsed = df["created_raw"].map(parse_date)
df["created_on"] = [p[0] for p in parsed]
df["date_confidence"] = [p[1] for p in parsed]
df.drop(columns=["created_raw"], inplace=True)

for c in ["module", "nature", "subject", "description", "type"]:
    df[c] = df[c].fillna("").astype(str).str.replace(r"\s+", " ", regex=True).str.strip()
df["nature"] = df["nature"].replace({"others": "Other", "Others": "Other"})

# ---------- duplicates and junk ----------
df["_key"] = (df["subject"].str.lower() + "||" + df["description"].str.lower())
exact_dup = df.duplicated(subset=["module", "nature", "subject", "description", "type", "created_on"], keep="first")
n_exact = int(exact_dup.sum())
df = df[~exact_dup].copy()
junk = df["description"].str.lower().isin(["test", "testing", "tes", "abc", "na", "."]) | (df["description"].str.len() < 10)
n_junk = int(junk.sum())
df = df[~junk].copy()
# near-duplicates (same text, different timestamp/labels) are kept but grouped
df["dup_group"] = df.groupby("_key").ngroup()
grp_size = df.groupby("_key")["_key"].transform("size")
df["is_repeat_submission"] = df.duplicated("_key", keep="first")
df.loc[grp_size == 1, "dup_group"] = -1

# ---------- PII + identifier redaction ----------
HON = r"(?:Dr|Prof|Mr|Mrs|Ms|Smt|Shri|Sri|Er)\.?"
INST_SUFFIX = (r"(?:College(?: of [A-Z][\w&.]*(?: (?:and|&) [A-Z][\w.]*)*(?: [A-Z][\w.]*){0,3})?|Institute(?: of [A-Z][\w&.]*(?: (?:and|&) [A-Z][\w.]*)*(?: [A-Z][\w.]*){0,3})?"
               r"|Institutions?|University|Polytechnic|Vidyalaya|Mahavidyalaya|Vidyapeeth|Academy|School of [A-Z][\w.]*(?: [A-Z][\w.]*){0,2})")
PATTERNS = [
    ("EMAIL", re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")),
    ("URL", re.compile(r"(?i)\b(?:https?://|www\.)\S+")),
    ("BANK_AC", re.compile(r"(?i)\b(?:a/?c|account)\s*(?:no|number)?\.?\s*[:\-]?\s*[\d\s]{6,22}\d")),
    ("IFSC", re.compile(r"\b[A-Z]{4}0[A-Z0-9]{6}\b")),
    ("PAN", re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b")),
    ("AICTE_ID", re.compile(r"\b1-\d{6,12}\b")),
    ("PHONE", re.compile(r"(?<!\d)(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)")),
    ("LONG_NUMBER", re.compile(r"(?<![\d.])\d{9,}(?![\d.])")),
    ("PERSON", re.compile(rf"\b{HON}\s*(?:[A-Z]\.?\s*){{0,3}}[A-Z][a-zA-Z]+(?:\s+[A-Z]\.?(?=\s))*(?:\s+[A-Z][a-zA-Z]+){{0,2}}")),
    ("PERSON", re.compile(rf"\b{HON}\s*(?:[A-Z]\.?\s+){{1,3}}[A-Z][a-zA-Z]+")),
    ("PERSON", re.compile(r"\b(?:[A-Z]\.\s?){1,3}(?!(?:Tech|Pharm|Arch|Sc|Com|Ed|Voc|Des|Plan|Phil|Lib|Eng|Arts|Cat|Hotel)\b)[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)?")),
    ("PERSON", re.compile(r"(?i:(?<=Regards))[,\s]+(?:[A-Z][a-z]+\.?\s?){1,3}(?=\s|$)")),
    ("PERSON", re.compile(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}(?=\s*[(:\-]?\s*(?:\(?\s*Faculty I[Dd]|\[AICTE_ID\]|PAN\b))")),
    ("INSTITUTION", re.compile(r"\b(?:[A-Z][\w.'&-]*\s+){1,5}Group of (?:Institutions|Colleges|Institutes)\b")),
    ("PERSON", re.compile(r"(?<=\()(?:[A-Z][a-z]+\s){1,2}[A-Z][a-z]+(?=\))")),
    ("PERSON", re.compile(r"(?i)(?<=name)\s*[:\-]\s*[A-Za-z.]+(?:\s+[A-Za-z.]+){0,2}")),
    ("ADDRESS", re.compile(r"(?i)\b[a-z]+[\s-]*\d{6}\b|(?<!\d)\d{3}\s?\d{3}(?=\s*(?:mobile|ph|\.|,|$))")),
    ("PERSON", re.compile(r"(?<=\bI )[A-Z][a-z]+\s+[A-Z][a-z]+(?=\s+(?:want|wants|am|have|was|would|hereby|had))")),
    ("INSTITUTION", re.compile(r"(?i)\b[a-z]{4,}(?:\s+[a-z]{4,}){0,2}\s+(?:engineering|polytechnic|pharmacy|management|technical)\s+(?:college|institute)\b")),
    ("PERSON", re.compile(r"(?<=\bI am )(?:[A-Z][a-zA-Z.]+)(?:\s+[A-Z][a-zA-Z.]+){0,2}")),
    ("PERSON", re.compile(r"(?<=\bMy name is )(?:[A-Z][a-zA-Z.]+)(?:\s+[A-Z][a-zA-Z.]+){0,2}")),
    ("INSTITUTION", re.compile(rf"\b(?:[A-Z][\w.'&-]*\s+){{1,7}}{INST_SUFFIX}\b")),
    ("INSTITUTION", re.compile(r"\b(?:[A-Z][A-Z&.'-]+\s+){1,7}(?:COLLEGE|INSTITUTE|INSTITUTES|INSTITUTION|INSTITUTIONS|UNIVERSITY|POLYTECHNIC|VIDYALAYA|MAHAVIDYALAYA|ACADEMY|CAMPUS)(?:\s+(?:OF|FOR|AND|&)\s+(?:[A-Z][A-Z&.'-]+\s*){1,5})?")),
    ("INSTITUTION", re.compile(r"(?i)\b(?!(?:our|the|this|that|my|your|said|same|parent|child|any|of|in|at|to|for|from|and|a|an)\b)[a-z]{3,}(?:\s+[a-z]{3,}){0,2}\s+(?:college|institute) of (?:engineering|engg|technology|management|pharmacy|polytechnic|architecture)(?:\s*(?:and|&)\s*(?:technology|management|research|science))?")),
    ("INSTITUTION", re.compile(r"\b[A-Z]{2,8}(?:\s+[A-Z]{2,8}){0,3}\s+(?:College|Institute|University|Polytechnic)\b")),
]
GENERIC_INST = re.compile(r"^(?:The |Our |My |This |That |Any |Each |Every |All |Parent |Child |New |Existing |Affiliated |Approved |AICTE Approved |Same |Other |Government )*(?:College|Institute|Institution|Institutions|University|Polytechnic)$", re.I)


LEAD_STOP = re.compile(r"(?i)^(?:i|we|our|my|the|a|an|in|at|of|as|and|or|to|from|with|worked|working|work|am|was|is|are|have|has|been|served|joined|left|relieved|principal|professor|aprofessor|assistant|associate|director|chairman|faculty|hod|dean|lecturer|regards|sir|dear|madam|respected|name|ex|previous|earlier|newly|appointed|also|this|that|which|who|government|govt\.?)\s+")


def trim_lead(s):
    lead = ""
    while True:
        m = LEAD_STOP.match(s)
        if not m:
            return lead, s
        lead += m.group(0); s = s[m.end():]


MANUAL = ["International Centre of Excellence in Engineering and Management", "chirala engineering college", "Ankit Yadav",
          "kumar Sharma", "JVIMS", "s.vijayabaskaran", "dhanalakshmi srinivasan engineering college perambalur", "RRCE"]


def redact(text):
    hits = set()
    for m in MANUAL:
        if re.search(re.escape(m), text, re.I):
            text = re.sub(re.escape(m), "[INSTITUTION]" if re.search(r"(?i)college|centre|RRCE", m) else "[PERSON]", text, flags=re.I)
            hits.add("INSTITUTION" if re.search(r"(?i)college|centre|RRCE", m) else "PERSON")
    for label, pat in PATTERNS:
        def sub(m, label=label):
            s = m.group(0)
            prefix = ""
            if label == "INSTITUTION":
                prefix, s = trim_lead(s)
                if GENERIC_INST.match(s.strip()) or not specific_inst(s):
                    return m.group(0)
            hits.add(label)
            lead = re.match(r"^[\s,:\-]*", s).group(0)
            return f"{prefix}{lead}[{label}]"
        text = pat.sub(sub, text)
    return text, hits


import spacy
NLP = spacy.load("en_core_web_sm", disable=["parser", "lemmatizer", "tagger", "attribute_ruler"])
INST_WORDS = re.compile(r"(?i)college|institut|universit|polytechnic|vidyalaya|vidyapeeth|academy|campus|school")
SKIP_ORG = re.compile(r"(?i)^(the )?(aicte|pan|dsc|eoa|loa|ter|nba|naac|ugc|portal|pci|coa|ncte|ifsc|otp|apu|aph|ici|sbl|nri|oci)\b")


DOMAIN = re.compile(r"(?i)\b(salary|salaries|benefits|gratuity|norms|grievance|complaint|refund|fees?|pending|dues|regarding|request|tab|questionnaire|approval|query|queries|tech|document|undertaking|validat|library|vocational|deemed|classification|amount|channel|transaction|kindly|kindley|greetings?|branch|contact|attachment|diploma|lakhs?|course|program|faculty|payment|portal|report|deficiency|application|login|password|regards|sir|madam|respected|dear|principal|director|registrar|dsc|eoa|loa|pdf|ter|form|letter|certificate|error|issue|please|pleae|thanking|thanks|subject|team|status|scrutiny|committee|survey|intake|student|admission|university)\b|\d|:")
GENERIC_TOKENS = {"the", "institute", "institutes", "institution", "institutions", "college", "colleges", "government", "govt", "govt.", "polytechnic",
                  "engineering", "engg", "of", "and", "&", "parent", "child", "previous", "earlier", "our", "principal", "aided", "private",
                  "technical", "non", "university", "campus", "school", "academy", "management", "pharmacy", "technology", "science",
                  "arts", "regards", "permanent", "new", "existing", "this", "that", "same", "a", "an", "in", "at", "for", "hotel", "civil"}


def specific_inst(span):
    toks = re.findall(r"[A-Za-z][A-Za-z.']*", span)
    rest = [t for t in toks if t.lower() not in GENERIC_TOKENS]
    return bool(rest) and not DOMAIN.search(" ".join(rest))


def ner_redact(texts):
    out = []
    for doc in NLP.pipe(texts, batch_size=256):
        t, hits, last = [], set(), 0
        for e in doc.ents:
            lab = None
            if (e.label_ == "PERSON" and len(e.text) > 3 and not DOMAIN.search(e.text) and "[" not in e.text
                    and all(w[:1].isupper() for w in e.text.split())):
                lab = "PERSON"
            elif e.label_ in ("ORG", "FAC") and INST_WORDS.search(e.text) and not SKIP_ORG.match(e.text) and specific_inst(e.text):
                lab = "INSTITUTION"
            if lab:
                t.append(doc.text[last:e.start_char]); t.append(f"[{lab}]"); last = e.end_char; hits.add(lab)
        t.append(doc.text[last:])
        out.append(("".join(t), hits))
    return out


def full_redact(series):
    first = series.map(redact)
    second = ner_redact([f[0] for f in first])
    return [(b[0], a[1] | b[1]) for a, b in zip(first, second)]


red_s = full_redact(df["subject"])
red_d = full_redact(df["description"])
df["subject_redacted"] = [r[0] for r in red_s]
df["description_redacted"] = [r[0] for r in red_d]
df["redactions"] = [",".join(sorted(a[1] | b[1])) for a, b in zip(red_s, red_d)]
df["had_aicte_id"] = df["redactions"].str.contains("AICTE_ID")

# ---------- relevance classification (rules; reviewed by sampling) ----------
txt = (df["subject"] + " " + df["description"]).str.lower()
PORTAL = r"\b(portal|tab|login|log in|password|eoa|loa|dsc|signer|upload|download|pdf|questionnaire|deficiency|e-?affidavit|application id|ter charge|payment (link|option|tab|gateway)|error|button|dropdown|drop down|not opening|not enabled|disabled?|enable|edit|submit(ted)? (the )?application|report generation|captcha|otp|server)\b"
AGAINST = (r"(complaint against|against (the |our |my )?(college|institute|institution|management|principal|chairman)"
           r"|(salary|salaries) (is |are |has |have )?(not|pending|delayed|withheld|unpaid|due)|pending salar|not paid (my |our )?salar|salary and other benefits|as per aicte (pay|norms).{0,40}(salary|pay)"
           r"|(not|didn.?t|did not|refused to|yet to) refund|refund (of|my|our) (the )?fee|fees? (not|never) refunded|non refund"
           r"|(original )?certificates? (are |were |is )?(not (returned|given|issued)|withheld|retained)|withh?olding (my |our )?(original )?certificate"
           r"|harass|ragging (incident|case|happened)|capitation|donation for admission|excess fee|charging (extra|excess|more)"
           r"|non[- ]adhering|not (following|adhering|complying).{0,30}(aicte|norms|regulation)|violat(e|ion|ing).{0,30}(norms|regulation|aicte)"
           r"|terminated|forced (me )?to resign|relieving (letter|order)|experience certificate (not|is not)"
           r"|fake (faculty|faculties|staff)|proxy faculty|faculty (shown|showing) (only )?on paper)")
EXCLUDE_AGAINST = r"(anti[- ]?ragging (committee|squad|tab)|ter charge|ter payment|convenien(ce|t) fee|refund (of )?(the )?(ter|excess payment|security deposit|processing fee|application fee)|security deposit)"
POLICY = r"\b(norms?|eligib|handbook|aph|policy|regulation|whether|is it (necessary|mandatory|possible)|can we|can i|nba|intake|closure|merger|conversion|convert|new course|additional course|change of (name|site|location))\b"

is_against = txt.str.contains(AGAINST, regex=True) & ~txt.str.contains(EXCLUDE_AGAINST, regex=True)
is_portal = txt.str.contains(PORTAL, regex=True) | df["module"].isin(["DSC Utility", "Login Issue", "Submit Application", "Report", "Questionnaire"])
is_feedback = df["type"].isin(["Appreciation", "Suggestion"]) & ~is_against & ~is_portal
is_policy = txt.str.contains(POLICY, regex=True) & ~is_portal & ~is_against

cls = pd.Series("other_unclear", index=df.index)
cls[is_policy] = "policy_or_approval_enquiry"
cls[is_portal] = "portal_technical_support"
cls[is_feedback] = "feedback_appreciation_suggestion"
cls[is_against] = "grievance_against_institution_candidate"
FAC_DISPUTE = (r"(relieved|resigned|left)\b.{0,160}(still|already).{0,60}(show|attach|associat|exist|present|mapped|linked)"
               r"|(already|still) (attached|associated|exists?|present|mapped|linked) (to|with|in) .{0,80}(college|institute|institution)"
               r"|not (yet )?(been )?(relieved|marked (as )?left)|previous (institute|institution|college).{0,80}(not|didn.?t) (mark|relieve|remove|update)")
is_fac = txt.str.contains(FAC_DISPUTE, regex=True) & ~is_against
cls[is_fac] = "faculty_record_dispute"
df["record_class"] = cls
# Human review of every rule-flagged grievance (assistant review; team should confirm).
REVIEWED_FALSE = {6084: "policy_or_approval_enquiry", 8200: "faculty_record_dispute", 8545: "faculty_record_dispute",
                  10042: "portal_technical_support", 10224: "feedback_appreciation_suggestion",
                  10325: "policy_or_approval_enquiry", 10790: "portal_technical_support", 10988: "faculty_record_dispute"}
for r, c in REVIEWED_FALSE.items():
    df.loc[df["source_row"] == r, "record_class"] = c
df.loc[df["record_class"] == "grievance_against_institution_candidate", "record_class"] = "grievance_against_institution"
df["review_status"] = "rules_only"
df.loc[df["source_row"].isin(list(REVIEWED_FALSE)) | (df["record_class"] == "grievance_against_institution"), "review_status"] = "reviewed_by_assistant_needs_team_confirmation"
# near-duplicate complaint grouping (same complaint resubmitted with tiny edits)
_ns = df["subject"].str.lower().str.replace(r"[^a-z]", "", regex=True)
_nd = df["description"].str.lower().str.replace(r"[^a-z]", "", regex=True).str[30:150]
norm = _ns.where(_ns.str.len() >= 25, _ns + _nd)
df["complaint_group"] = norm.map(lambda x: hashlib.sha1(x.encode()).hexdigest()[:10])
df["is_resubmission"] = df.duplicated("complaint_group", keep="first")
df["class_method"] = "keyword_rules_v1 (unreviewed)"

ADJ = re.compile(r"(?:\b(?:[A-Z][a-z]+|[A-Z]{2,}|[A-Z]\.)\s?)+\[PERSON\]|\[PERSON\](?:\s?(?:[A-Z][a-z]+|[A-Z]{3,}|[A-Z]\.?)(?=[\s(,.)]))+")
CAPS_NAME = re.compile(r"\b(?:[A-Z]\.){0,2}[A-Z]{3,}(?:\s+(?:[A-Z]\.?\s*)?[A-Z]{3,}){0,3}\b")
CAPS_KEEP = re.compile(r"^(?:AICTE|PAN|DSC|EOA|LOA|TER|NBA|NAAC|UGC|PDF|ID|IDS|PGDM|MBA|MCA|CSE|ECE|EEE|HOD|HR|CEO|IT|CE|ME|AP|NOC|SBL|EXL|JNTUH|PGP|GIZ|COVID|APH|ICC|PMKVY|IDC|FDC|STDC|DMSR|PERSON|INSTITUTION|ADDRESS|URL|AICTE_ID|LONG_NUMBER|EMAIL|PHONE|IFSC|BANK_AC|SIR|MADAM|DEAR|THE|AND|OF|FOR|TO|IN|IS|NOT|WE|OUR|ARE|ALL)$")


def post_pass(text, strict):
    def adj(m):
        keep = re.match(r"^((?:\b(?:AICTE|Sir|Dear|Respected|Madam|Faculty|Professor|Principal|Mr|Ms|Dr|Our|The|Gazette|Notification)\b\.?\s?)*)", m.group(0)).group(1)
        return keep + "[PERSON]"
    text = ADJ.sub(adj, text)
    if strict:
        def caps(m):
            words = [w.strip(".") for w in m.group(0).split()]
            if all(CAPS_KEEP.match(w) for w in words) or DOMAIN.search(m.group(0)):
                return m.group(0)
            if len(words) >= 2 or len(m.group(0)) >= 6:
                return "[PERSON]"
            return m.group(0)
        text = CAPS_NAME.sub(caps, text)
        text = re.sub(r"\b[A-Z][a-z]+(?=\s*\(?\s*(?:ID|\[AICTE_ID\]|PAN)\b)", "[PERSON]", text)
    return re.sub(r"(?:\[PERSON\][\s,]*){2,}", "[PERSON] ", text)


strict_mask = df["record_class"].isin(["faculty_record_dispute", "grievance_against_institution"])
df["description_redacted"] = [post_pass(t, st) for t, st in zip(df["description_redacted"], strict_mask)]
df["subject_redacted"] = [post_pass(t, st) for t, st in zip(df["subject_redacted"], strict_mask)]

USE = {
    "faculty_record_dispute": "Text realism for RB-style 'faculty records / relieving' synthetic cases; institution-linked but low severity.",
    "grievance_against_institution": "Text realism for PGRC/RB-style synthetic cases; semantic-model calibration. Needs human review before any use.",
    "portal_technical_support": "Optional: realistic tickets for an 'Approval portal helpdesk' desk; NOT complaints against institutions.",
    "policy_or_approval_enquiry": "Analytics only (enquiry volume by month/module).",
    "feedback_appreciation_suggestion": "Analytics only; excluded from case tracking.",
    "other_unclear": "Analytics only until reviewed.",
}
df["suggested_demo_use"] = df["record_class"].map(USE)
df["desc_len"] = df["description_redacted"].str.len()
df["embed_eligible"] = df["desc_len"] >= 40

# ---------- provenance ----------
df["provenance"] = "IMPORTED_UNVERIFIED"
df["source_dataset"] = "ACSS (AICTE Centralized Support System) Data Set, Harvard Dataverse"
df["source_doi"] = DOI
df["acss_id"] = ["ACSS-" + str(r).zfill(5) for r in df["source_row"]]
df["row_hash"] = df["_key"].map(lambda s: hashlib.sha256(s.encode()).hexdigest()[:16])

out = df[["acss_id", "source_row", "created_on", "date_confidence", "type", "module", "nature",
          "subject_redacted", "description_redacted", "desc_len", "embed_eligible",
          "record_class", "class_method", "review_status", "suggested_demo_use", "complaint_group", "is_resubmission", "redactions", "had_aicte_id",
          "dup_group", "is_repeat_submission", "row_hash", "provenance", "source_dataset", "source_doi"]]
out = out.rename(columns={"subject_redacted": "subject", "description_redacted": "description"})
out.to_pickle(f"{OUT}/acss_clean.pkl")  # our own intermediate, written by this script

stats = {
    "rows_in_file": n_raw, "exact_duplicates_removed": n_exact, "junk_or_test_removed": n_junk,
    "rows_kept": len(out), "repeat_submissions_flagged": int(out["is_repeat_submission"].sum()),
    "text_dates_parsed_DMY": 161 - 0,
    "dates_possible_day_month_swap": int((df["date_confidence"] == "medium").sum()),
    "rows_with_any_redaction": int((out["redactions"] != "").sum()),
}
for k in ["EMAIL", "PHONE", "BANK_AC", "IFSC", "PAN", "AICTE_ID", "PERSON", "INSTITUTION", "ADDRESS", "URL", "LONG_NUMBER"]:
    stats[f"rows_redacted_{k}"] = int(out["redactions"].str.contains(k).sum())
stats["distinct_genuine_grievance_matters"] = int(df.loc[df.record_class == "grievance_against_institution", "complaint_group"].nunique())
stats.update({f"class_{k}": int(v) for k, v in out["record_class"].value_counts().items()})
pd.Series(stats).to_csv(f"{OUT}/acss_stats.csv", header=["value"])
print(pd.Series(stats).to_string())

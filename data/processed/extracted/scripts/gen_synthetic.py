"""Generate clearly-labelled SYNTHETIC monitoring data for the SIH prototype.
Usage: python3 -I gen_synthetic.py <out_dir>
Every record carries provenance=SYNTHETIC. Names/IDs are deliberately fictional
(letter-triplet institution names, SYN- identifiers, role-numbered officers).
"""
import sys, random, hashlib, itertools, datetime as dt
import pandas as pd

OUT = sys.argv[1]
R = random.Random(2026)
AS_OF = dt.date(2026, 10, 31)          # demo "today"
START = dt.date(2025, 11, 1)
PROV = "SYNTHETIC"

# ------------------------------------------------------------------ geography (real places; mapping to regions is synthetic)
PLACES = [("Maharashtra", "Pune", "West"), ("Maharashtra", "Nagpur", "West"), ("Maharashtra", "Aurangabad", "West"),
          ("Karnataka", "Belagavi", "South-West"), ("Karnataka", "Mysuru", "South-West"), ("Kerala", "Thrissur", "South-West"),
          ("Tamil Nadu", "Coimbatore", "South"), ("Tamil Nadu", "Madurai", "South"), ("Telangana", "Warangal", "South-Central"),
          ("Andhra Pradesh", "Guntur", "South-Central"), ("Uttar Pradesh", "Lucknow", "Northern"), ("Uttar Pradesh", "Agra", "Northern"),
          ("Rajasthan", "Jaipur", "North-West"), ("Rajasthan", "Udaipur", "North-West"), ("Punjab", "Ludhiana", "North-West"),
          ("West Bengal", "Durgapur", "Eastern"), ("Odisha", "Cuttack", "Eastern"), ("Assam", "Guwahati", "North-East"),
          ("Madhya Pradesh", "Indore", "Central"), ("Gujarat", "Vadodara", "Central")]
TYPES = [("Engineering College", "Engineering", 0.35), ("Institute of Technology", "Engineering", 0.2), ("Polytechnic", "Diploma", 0.15),
         ("College of Pharmacy", "Pharmacy", 0.1), ("Institute of Management", "Management", 0.12), ("School of Architecture", "Architecture", 0.08)]
COURSES = {"Engineering": ["B.Tech Computer Science", "B.Tech Mechanical", "B.Tech Civil", "B.Tech Electronics", "M.Tech Structural"],
           "Diploma": ["Diploma Civil", "Diploma Mechanical", "Diploma Electrical"],
           "Pharmacy": ["B.Pharm", "D.Pharm", "M.Pharm"],
           "Management": ["MBA", "PGDM", "MCA"],
           "Architecture": ["B.Arch"]}
DEPTS = {"Engineering": ["Computer Science", "Mechanical", "Civil", "Electronics"], "Diploma": ["Civil", "Mechanical", "Electrical"],
         "Pharmacy": ["Pharmaceutics", "Pharmacology"], "Management": ["Management Studies", "Computer Applications"], "Architecture": ["Architecture"]}

# ------------------------------------------------------------------ institutions
letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
codes = []
for i in range(0, 24):
    codes.append(letters[i:i + 3])
for a, b, c in [("X", "Y", "Z"), ("K", "L", "N"), ("R", "S", "V"), ("D", "M", "P"), ("G", "T", "W"), ("B", "H", "J"), ("C", "F", "K"),
                ("E", "N", "Q"), ("A", "R", "T"), ("L", "P", "S"), ("M", "V", "Y"), ("F", "J", "R"), ("H", "N", "T"), ("A", "D", "G"),
                ("B", "E", "K"), ("C", "M", "S"), ("D", "H", "V"), ("E", "L", "R"), ("G", "K", "P"), ("J", "N", "W"), ("K", "Q", "U"),
                ("P", "S", "Y"), ("T", "V", "Z"), ("A", "K", "M"), ("B", "L", "Q"), ("C", "N", "R"), ("D", "S", "X"), ("F", "H", "M"),
                ("G", "N", "U"), ("H", "P", "W"), ("J", "M", "Q"), ("A", "B", "D"), ("L", "M", "O"), ("P", "Q", "S"), ("U", "V", "X"), ("N", "O", "R"), ("Q", "R", "T")]:
    codes.append(a + b + c)
codes = list(dict.fromkeys(codes))[:60]

inst_rows = []
for i, code in enumerate(codes, 1):
    tname, stream, _ = R.choices(TYPES, weights=[t[2] for t in TYPES])[0]
    st, dist, reg = PLACES[(i * 7) % len(PLACES)]
    if code == "ABC":
        tname, stream, (st, dist, reg) = "Engineering College", "Engineering", PLACES[0]
    inst_rows.append(dict(institution_id=f"SYN-INST-{i:04d}", aicte_permanent_id=f"SYN-1-{100000 + i * 37:06d}",
                          name=f"{code} {tname}", stream=stream, state=st, district=dist, region=reg,
                          ownership=R.choice(["Private-Self Financing", "Private-Self Financing", "Government", "Government Aided"]),
                          established=R.randint(1985, 2018), provenance=PROV))
# deliberate ambiguity: two "PQR Institute of Technology" in different states
pqr = [r for r in inst_rows if r["name"].startswith("PQR ")][0]
PQR2 = f"SYN-INST-{len(inst_rows) + 1:04d}"
pqr.update(name="PQR Institute of Technology", stream="Engineering", state="Maharashtra", district="Pune", region="West")
inst_rows.append(dict(institution_id=f"SYN-INST-{len(inst_rows) + 1:04d}", aicte_permanent_id="SYN-1-102294", name="PQR Institute of Technology",
                      stream="Engineering", state="Karnataka", district="Belagavi", region="South-West", ownership="Private-Self Financing",
                      established=2009, provenance=PROV))
INST = pd.DataFrame(inst_rows)
by_id = {r["institution_id"]: r for r in inst_rows}

# ------------------------------------------------------------------ aliases = identity-resolution test set
ABBR = {"Engineering": "Engg.", "Institute": "Inst.", "Technology": "Tech.", "College": "Coll.", "Management": "Mgmt.", "Pharmacy": "Pharm."}
alias_rows = []


def dotted(code):
    return ".".join(code) + "."


for r in inst_rows:
    code, rest = r["name"].split(" ", 1)
    variants = [
        (f"{code} {' '.join(ABBR.get(w, w) for w in rest.split())}", r["district"], "VERIFIED", "abbreviation"),
        (f"{dotted(code)} {rest}, {r['district']}", r["district"], "VERIFIED", "dotted initials + city"),
        (f"{code.lower()} {rest.lower()}", "", "VERIFIED", "lower case, no location"),
    ]
    for raw, loc, exp, note in R.sample(variants, 2):
        alias_rows.append(dict(raw_name=raw, raw_location=loc, expected_institution_id=r["institution_id"], expected_decision=exp, case_note=note))
# hard cases
alias_rows += [
    dict(raw_name="PQR Institute of Technology", raw_location="", expected_institution_id="", expected_decision="VERIFICATION_QUEUE",
         case_note="two institutions share this name; no location -> must not auto-link"),
    dict(raw_name="PQR Inst. of Tech., Belagavi", raw_location="Belagavi", expected_institution_id=PQR2, expected_decision="VERIFIED",
         case_note="location disambiguates"),
    dict(raw_name="PQR Institute of Technology Pune", raw_location="Pune", expected_institution_id=pqr["institution_id"], expected_decision="VERIFIED",
         case_note="location disambiguates"),
    dict(raw_name="ABX Engineering College", raw_location="Pune", expected_institution_id="", expected_decision="VERIFICATION_QUEUE",
         case_note="one letter from ABC; similar but not exact -> human check"),
    dict(raw_name="Abc Engg Colege", raw_location="Pune", expected_institution_id="SYN-INST-0001", expected_decision="VERIFIED",
         case_note="typo + abbreviation, same city"),
    dict(raw_name="Sunrise Valley Institute of Science", raw_location="Jaipur", expected_institution_id="", expected_decision="UNRESOLVED",
         case_note="not in master list"),
    dict(raw_name="the college", raw_location="", expected_institution_id="", expected_decision="UNRESOLVED", case_note="no identifying name"),
    dict(raw_name=f"{by_id['SYN-INST-0001']['aicte_permanent_id']}", raw_location="", expected_institution_id="SYN-INST-0001",
         expected_decision="VERIFIED", case_note="exact permanent ID"),
]
ALIAS = pd.DataFrame(alias_rows)
ALIAS.insert(0, "alias_test_id", [f"SYN-ALIAS-{i:03d}" for i in range(1, len(ALIAS) + 1)])
ALIAS["provenance"] = PROV

# ------------------------------------------------------------------ bureaus, users
BUREAUS = pd.DataFrame([
    dict(code="PGRC", name="Public Grievance Redressal Cell", sla_days_default=30, provenance=PROV,
         note="Name from the problem statement; SLA values are synthetic configuration, not AICTE timelines"),
    dict(code="RB", name="Regulation Bureau", sla_days_default=60, provenance=PROV, note="Name from the problem statement; SLA synthetic"),
    dict(code="AB", name="Approval Bureau", sla_days_default=45, provenance=PROV,
         note="Example of an 'other concerned Bureau'; SLA synthetic"),
])
users = []
for b in ["PGRC", "RB", "AB"]:
    users.append(dict(user_id=f"SYN-USR-{b}-H", display_name=f"{b} Bureau Head", role="bureau_head", bureau=b, region=""))
    for k in range(1, 5):
        users.append(dict(user_id=f"SYN-USR-{b}-{k:02d}", display_name=f"{b} Officer {k:02d}", role="bureau_officer", bureau=b, region=""))
for reg in sorted({p[2] for p in PLACES}):
    users.append(dict(user_id=f"SYN-USR-REG-{reg.upper().replace('-', '')[:6]}", display_name=f"Regional Official ({reg})",
                      role="regional_official", bureau="", region=reg))
users += [dict(user_id="SYN-USR-MGMT-01", display_name="Senior Management 01", role="senior_management", bureau="", region=""),
          dict(user_id="SYN-USR-MGMT-02", display_name="Senior Management 02", role="senior_management", bureau="", region=""),
          dict(user_id="SYN-USR-ADMIN-01", display_name="System Administrator 01", role="admin", bureau="", region="")]
USERS = pd.DataFrame(users)
USERS["email"] = USERS["user_id"].str.lower().str.replace("syn-usr-", "") + "@demo.invalid"
USERS["provenance"] = PROV
officers = {b: [u["user_id"] for u in users if u["bureau"] == b and u["role"] == "bureau_officer"] for b in ["PGRC", "RB", "AB"]}
heads = {b: f"SYN-USR-{b}-H" for b in ["PGRC", "RB", "AB"]}

# ------------------------------------------------------------------ categories + related-category matrix
CATS = {
    "PGRC": {"fee_refund": 30, "certificate_withheld": 21, "salary_non_payment": 30, "harassment_or_misconduct": 21,
             "admission_irregularity": 30, "infrastructure_deficiency": 45, "faculty_profile_misuse": 30},
    "RB": {"fee_regulation_compliance": 60, "faculty_norms_compliance": 60, "intake_violation": 45, "unapproved_course": 45,
           "infrastructure_norms": 60, "fake_faculty": 45},
    "AB": {"approval_condition_noncompliance": 45, "approval_deficiency": 30},
}
CAT_BUREAU = {c: b for b, cs in CATS.items() for c in cs}
RELATED = [("fee_refund", "fee_regulation_compliance"), ("certificate_withheld", "fee_regulation_compliance"),
           ("salary_non_payment", "faculty_norms_compliance"), ("admission_irregularity", "intake_violation"),
           ("admission_irregularity", "unapproved_course"), ("infrastructure_deficiency", "infrastructure_norms"),
           ("infrastructure_deficiency", "approval_deficiency"), ("faculty_profile_misuse", "fake_faculty"),
           ("faculty_profile_misuse", "faculty_norms_compliance"), ("intake_violation", "approval_condition_noncompliance"),
           ("infrastructure_norms", "approval_deficiency"), ("fake_faculty", "approval_deficiency"),
           ("unapproved_course", "approval_condition_noncompliance")]
CATMAT = pd.DataFrame([dict(category_a=a, bureau_a=CAT_BUREAU[a], category_b=b, bureau_b=CAT_BUREAU[b], rule_points=0.25,
                            provenance=PROV) for a, b in RELATED])
REL = {frozenset(p) for p in RELATED}

# ------------------------------------------------------------------ issue "matters" and voiced templates
# Each issue type has a PGRC (complainant) voice, an RB (regulatory) voice and an AB (approval) voice.
ISSUES = {
    "fees": dict(cats={"PGRC": "fee_refund", "RB": "fee_regulation_compliance"},
                 PGRC=["I withdrew from the {course} programme at {inst} on {date} and applied for a refund of Rs. {amt}. Even after {n} reminders the college has not refunded my fees and the accounts office now says the refund is 'under consideration'.",
                       "My admission to {course} was cancelled within the permitted period, but {inst} is keeping the full fee of Rs. {amt}. They say fees are non-refundable once classes start. Please direct the institute to return my money.",
                       "Requesting help with a fee refund. I paid Rs. {amt} for {course} in {ay} and left in the first month. The institute has neither refunded the amount nor replied to my written application dated {date}."],
                 RB=["Information received that {inst} is retaining fees of students who withdraw admission from {course}, contrary to the refund provisions applicable for {ay}. Compliance report on the institute's refund practice to be called for.",
                     "Examination of fee refund compliance at {inst}: multiple withdrawals from {course} reportedly not refunded; amounts of about Rs. {amt} per student involved. Institute to submit its refund register for {ay}.",
                     "Regulatory review opened on non-compliance with fee-refund norms by {inst}. Allegation: refunds for cancelled admissions in {course} withheld for more than {n} months."],
                 AB=["Approval conditions for {inst} include adherence to fee and refund norms; reports of withheld refunds in {course} to be considered during the {ay} approval review."]),
    "salary": dict(cats={"PGRC": "salary_non_payment", "RB": "faculty_norms_compliance"},
                   PGRC=["I worked as Assistant Professor in the {dept} department of {inst} until {date}. Salary for {n} months is still pending and my repeated emails to the management are unanswered. Kindly help me get my dues.",
                         "Faculty members of {dept} at {inst} have been paid only part of their salary since {date}. We were told payments would resume after fee collection but nothing has been paid for {n} months.",
                         "Grievance regarding non-payment of salary and arrears by {inst}. I resigned from the {dept} department and the institute has not settled {n} months of salary or issued my relieving letter."],
                   RB=["Reported non-compliance with faculty pay norms at {inst}: teaching staff in {dept} allegedly paid below prescribed scales and salaries delayed by {n} months. Institute's salary statements for {ay} to be verified.",
                       "Compliance check on faculty salary and service conditions at {inst}. The institute's affidavit states pay as per norms, but information indicates salary arrears of {n} months in {dept}.",
                       "Review of {inst} for violation of faculty pay-scale requirements; salary disbursement records for the {dept} department to be called for and checked against the approval affidavit."],
                   AB=["{inst} declared full compliance with faculty pay norms in its {ay} application; inputs on unpaid salaries in {dept} to be verified before extension of approval."]),
    "certificates": dict(cats={"PGRC": "certificate_withheld", "RB": "fee_regulation_compliance"},
                         PGRC=["{inst} is refusing to return my original 10th and 12th certificates after I left {course}. They are demanding Rs. {amt} as the fee for the remaining years before releasing them.",
                               "My original documents are held by {inst} since admission to {course}. I need them for another admission but the college says certificates will be returned only after payment of the full course fee.",
                               "Request for help: the institute ({inst}) has kept my original certificates for {n} months and is asking for Rs. {amt} to release them. I have already cancelled my admission to {course}."],
                         RB=["Information that {inst} retains original certificates of students who leave {course} and demands fees for the full course duration; this is to be examined against the applicable regulations.",
                             "Regulatory note: alleged retention of original documents by {inst} as a condition for fee recovery from students of {course}. Institute to explain its practice for {ay}."],
                         AB=["Undertaking regarding non-retention of original certificates to be re-verified for {inst} in view of complaints from {course} students."]),
    "intake": dict(cats={"PGRC": "admission_irregularity", "RB": "intake_violation", "AB": "approval_condition_noncompliance"},
                   PGRC=["We were admitted to {course} at {inst} but now learn the college admitted about {n} more students than its sanctioned seats. Our enrolment is not appearing on the university portal and we are worried about our degree.",
                         "Students of {course} at {inst} were told in {date} that some of us were admitted in excess of the approved intake. The college is asking us to shift to another course. Please intervene.",
                         "Complaint about admission irregularity at {inst}: the college admitted students to {course} beyond the intake shown on the AICTE approval and is now not issuing ID cards to them."],
                   RB=["Excess admission reported at {inst}: {course} intake for {ay} appears to exceed the approved intake by about {n} seats. Data from the institute and the affiliating university to be compared.",
                       "Possible violation of approved intake by {inst} in {course} for {ay}; admission lists to be called for and checked against the approval letter."],
                   AB=["Approval condition review: {inst} reported admitted strength in {course} higher than the approved intake for {ay} by roughly {n} seats.",
                       "{inst} to show cause for admitting students beyond approved intake in {course} ({ay}) as a breach of approval conditions."]),
    "course": dict(cats={"PGRC": "admission_irregularity", "RB": "unapproved_course", "AB": "approval_condition_noncompliance"},
                   PGRC=["I took admission in {course} at {inst} in {ay}. I now find this programme is not listed in the institute's approval. Is my course valid? The college gives no clear answer.",
                         "Students of {course} at {inst} have learnt that the programme was started without approval. We have paid fees of Rs. {amt} each and want to know what will happen to our degrees."],
                   RB=["{inst} is reportedly running {course} without approval for {ay}. Website and admission advertisements to be examined and the institute asked to explain.",
                       "Unapproved programme alert: {course} advertised and admitted by {inst} although not shown in its approved course list."],
                   AB=["{course} at {inst} is not part of the approved programmes for {ay}; the institute's application and admissions to be reviewed."]),
    "infra": dict(cats={"PGRC": "infrastructure_deficiency", "RB": "infrastructure_norms", "AB": "approval_deficiency"},
                  PGRC=["Students of {inst} complain that the {dept} laboratories have had no working equipment for {n} months and the library has hardly any current books. Classes are held in a temporary building.",
                        "The hostel and laboratory facilities at {inst} are far below what was promised at admission. Practical sessions in {dept} have been cancelled repeatedly this semester.",
                        "Grievance about basic facilities at {inst}: no functioning computer lab for {course}, broken classroom furniture and no drinking water on the campus."],
                  RB=["Infrastructure deficiencies reported at {inst}: inadequate laboratories in {dept} and shortfall in built-up area relative to norms. Physical verification may be considered.",
                      "Compliance on infrastructure norms by {inst} doubtful; laboratory equipment for {dept} and library resources reportedly below requirement for {ay}."],
                  AB=["Deficiency noted for {inst}: laboratory and library resources in {dept} to be re-verified before approval for {ay}.",
                      "Approval deficiency report for {inst}: built-up area and laboratory facilities for {course} not matching the application for {ay}."]),
    "faculty": dict(cats={"PGRC": "faculty_profile_misuse", "RB": "fake_faculty", "AB": "approval_deficiency"},
                    PGRC=["I left {inst} on {date}, but my faculty profile still appears in their faculty list for {ay}. The college is using my name without my consent. Please remove my profile and act against the institute.",
                          "My name is shown as a faculty member of {inst} in the {dept} department although I have never worked there after {date}. I suspect my profile is being misused for approval.",
                          "Former faculty of {dept} complain that {inst} continues to show us on its faculty list and has not marked us as relieved on the portal, so we cannot join another institute."],
                    RB=["Suspected display of non-working faculty by {inst}: about {n} faculty profiles in {dept} reportedly belong to persons who left the institute. Faculty records for {ay} to be cross-checked.",
                        "Information that {inst} shows faculty on paper only in {dept}; attendance and salary records to be compared with the faculty list submitted for {ay}."],
                    AB=["Faculty shortfall suspected at {inst}: {n} profiles in {dept} listed in the {ay} application may not be working; approval team to verify."]),
    "harassment": dict(cats={"PGRC": "harassment_or_misconduct"},
                       PGRC=["Students of {course} at {inst} report harassment by a staff member of the {dept} department, including threats about internal marks. The internal complaints committee has not acted.",
                             "Complaint about misconduct at {inst}: students who raised the fee issue were threatened with detention from examinations by the administration."],
                       RB=[], AB=[]),
}

AYS = ["2025-26", "2026-27"]


def fill(t, inst, matter):
    return t.format(inst=inst["name"], **matter)


def make_matter(inst, kind):
    stream = inst["stream"]
    return dict(course=R.choice(COURSES[stream]), dept=R.choice(DEPTS[stream]), amt=f"{R.choice([45, 60, 75, 85, 95, 110, 125, 140])},000",
                n=R.randint(3, 9), ay=R.choice(AYS), date=(START + dt.timedelta(days=R.randint(0, 300))).strftime("%d %B %Y"), kind=kind)


# ------------------------------------------------------------------ cases
cases, gt = [], []
seq = itertools.count(1)
STATUS_ACTIVE = ["Received", "Assigned", "Under Process", "Action Initiated"]


def new_case(inst, bureau, category, text, subject, receipt, complainant=None, refs="", status=None, matter_id="", design=""):
    cid = f"SYN-{bureau}-{receipt.year}-{next(seq):04d}"
    sla = CATS[bureau][category]
    due = receipt + dt.timedelta(days=sla)
    if status is None:
        age = (AS_OF - receipt).days
        pdisp = min(0.75, age / (sla * 2.5))
        status = "Disposed" if R.random() < pdisp else R.choices(STATUS_ACTIVE, weights=[1, 2, 4, 3])[0]
        if status != "Disposed" and age > 1.5 * sla and R.random() < 0.6:
            status = "Disposed"
    c = dict(case_id=cid, institution_id=inst["institution_id"], identity_status="VERIFIED", raw_institution_name="",
             receipt_date=receipt, category=category, bureau=bureau, assigned_officer=R.choice(officers[bureau]) if status != "Received" else "",
             status=status, subject=subject, description=text, region=inst["region"], expected_disposal_date=due,
             complainant_ref=complainant or f"SYN-CMP-{R.randint(10000, 99999)}", refs=refs, matter_id=matter_id,
             design_note=design, provenance=PROV)
    cases.append(c)
    return c


SUBJ = {"fee_refund": "Fee refund not given", "fee_regulation_compliance": "Fee refund norms compliance", "certificate_withheld": "Original certificates withheld",
        "salary_non_payment": "Pending salary dues", "faculty_norms_compliance": "Faculty pay norms compliance", "admission_irregularity": "Admission irregularity",
        "intake_violation": "Excess intake", "unapproved_course": "Programme without approval", "approval_condition_noncompliance": "Breach of approval conditions",
        "infrastructure_deficiency": "Poor facilities", "infrastructure_norms": "Infrastructure norms compliance", "approval_deficiency": "Approval deficiency",
        "faculty_profile_misuse": "Faculty profile misused", "fake_faculty": "Faculty shown on paper", "harassment_or_misconduct": "Harassment complaint"}


def rdate(lo=0, hi=None):
    hi = hi if hi is not None else (AS_OF - START).days - 1
    return START + dt.timedelta(days=int(R.triangular(lo, hi, hi)))   # skewed to recent: queues are mostly young


def add_pair(a, b, relation, shares_ref, design):
    cross = a["bureau"] != b["bureau"]
    active = a["status"] != "Disposed" and b["status"] != "Disposed"
    within = abs((a["receipt_date"] - b["receipt_date"]).days) <= 180
    if relation == "same_matter":
        band = "HIGH" if shares_ref else "MEDIUM"      # minimum band a correct engine must reach
    elif relation == "duplicate_submission":
        band = "HIGH"
    else:
        band = "NONE"
    expect_alert = band != "NONE" and active and within and cross
    gt.append(dict(case_a=a["case_id"], case_b=b["case_id"], institution_id=a["institution_id"], bureau_a=a["bureau"], bureau_b=b["bureau"],
                   category_a=a["category"], category_b=b["category"], relation=relation, shares_reference=shares_ref, cross_bureau=cross,
                   both_active=active, expected_min_band=band, expected_cross_bureau_alert=expect_alert, design_note=design, provenance=PROV))


focus = [r for r in inst_rows if r["institution_id"] != PQR2]
R.shuffle(focus)
abc = by_id["SYN-INST-0001"]
pair_inst = [abc] + [r for r in focus if r is not abc]

# --- the scripted demo: ABC Engineering College, CASE-101 style (PGRC) vs CASE-205 style (RB)
m = make_matter(abc, "fees"); m.update(course="B.Tech Computer Science", amt="85,000", n=4, ay="2026-27")
d1 = AS_OF - dt.timedelta(days=41)
A = new_case(abc, "PGRC", "fee_refund", fill(ISSUES["fees"]["PGRC"][0], abc, m), "Fee refund not given after withdrawal", d1,
             complainant="SYN-CMP-00101", status="Under Process", matter_id="M-DEMO-1", design="DEMO: scripted overlap (PGRC side)")
B = new_case(abc, "RB", "fee_regulation_compliance", fill(ISSUES["fees"]["RB"][1], abc, m), "Refund practice compliance check", d1 + dt.timedelta(days=17),
             status="Action Initiated", matter_id="M-DEMO-1", design="DEMO: scripted overlap (RB side)")
add_pair(A, B, "same_matter", False, "Scripted demo pair: same fee-refund matter seen by PGRC and RB, different wording, no shared reference")
# A third ABC case that must NOT be flagged
C = new_case(abc, "AB", "approval_deficiency", fill(ISSUES["infra"]["AB"][0], abc, make_matter(abc, "infra")), "Laboratory deficiency",
             d1 + dt.timedelta(days=5), status="Under Process", matter_id="M-DEMO-2", design="DEMO: unrelated active case at same institution")
add_pair(A, C, "different_matter", False, "Same institution, different issue: should not alert")
add_pair(B, C, "different_matter", False, "Same institution, different issue: should not alert")

pi = itertools.cycle(pair_inst[1:])
KINDS_X = [k for k in ISSUES if k != "harassment"]

# --- T1: 60 same-matter cross-Bureau pairs, different wording
for i in range(60):
    inst = next(pi); kind = R.choice(KINDS_X); m = make_matter(inst, kind); cats = ISSUES[kind]["cats"]
    b1, b2 = R.sample([b for b in cats if ISSUES[kind][b]], 2) if len([b for b in cats if ISSUES[kind][b]]) > 2 else list(cats)[:2]
    d = rdate(230, 355); lag = R.randint(3, 45)
    same_cmp = R.random() < 0.25
    cmp = f"SYN-CMP-{R.randint(10000, 99999)}"
    status_a = R.choices(STATUS_ACTIVE + ["Disposed"], weights=[1, 2, 4, 3, 1.5])[0]
    a = new_case(inst, b1, cats[b1], fill(R.choice(ISSUES[kind][b1]), inst, m), SUBJ[cats[b1]], d, complainant=cmp, status=status_a, matter_id=f"M-{i:03d}")
    b = new_case(inst, b2, cats[b2], fill(R.choice(ISSUES[kind][b2]), inst, m), SUBJ[cats[b2]], min(d + dt.timedelta(days=lag), AS_OF - dt.timedelta(days=1)),
                 complainant=cmp if same_cmp else None, matter_id=f"M-{i:03d}",
                 status=R.choices(STATUS_ACTIVE + ["Disposed"], weights=[1, 2, 4, 3, 1])[0])
    add_pair(a, b, "same_matter", False, f"Same {kind} matter, {b1} and {b2} wording{'; same complainant' if same_cmp else ''}")

# --- T2: 40 pairs sharing a reference (case ID cited or common letter number), text may be terse
for i in range(40):
    inst = next(pi); kind = R.choice(KINDS_X); m = make_matter(inst, kind); cats = ISSUES[kind]["cats"]
    b1, b2 = list(cats)[:2]
    d = rdate(230, 350)
    letter = f"SYN/LTR/{d.year}/{R.randint(100, 999)}"
    a = new_case(inst, b1, cats[b1], fill(R.choice(ISSUES[kind][b1]), inst, m) + f" Ref: {letter}.", SUBJ[cats[b1]], d, refs=letter, matter_id=f"R-{i:03d}",
                 status=R.choices(STATUS_ACTIVE + ["Disposed"], weights=[1, 2, 4, 3, 2])[0])
    terse = R.random() < 0.5
    if terse:
        txt = f"Matter forwarded for examination as per {b1} reference {a['case_id']} ({letter}). Institute: {inst['name']}. Action as per rules."
        refs = f"{a['case_id']};{letter}"
    else:
        txt = fill(R.choice(ISSUES[kind][b2]), inst, m) + f" See also {letter}."
        refs = letter
    b = new_case(inst, b2, cats[b2], txt, SUBJ[cats[b2]], min(d + dt.timedelta(days=R.randint(2, 40)), AS_OF - dt.timedelta(days=1)),
                 refs=refs, matter_id=f"R-{i:03d}", status=R.choices(STATUS_ACTIVE, weights=[1, 2, 4, 3])[0])
    add_pair(a, b, "same_matter", True, "Shares reference number" + ("; second case is a terse forwarding note" if terse else ""))

# --- N1: 100 same-institution cross-Bureau DIFFERENT matters (30 are hard negatives in related categories)
for i in range(100):
    inst = next(pi)
    if i < 30:   # related categories but different specifics (different course/dept/year)
        kind = R.choice(["fees", "salary", "infra", "intake", "faculty"]); cats = ISSUES[kind]["cats"]; b1, b2 = list(cats)[:2]
        m1, m2 = make_matter(inst, kind), make_matter(inst, kind)
        tries = 0
        while (m2["course"] == m1["course"] and m2["dept"] == m1["dept"]) and tries < 10:
            m2 = make_matter(inst, kind); tries += 1
        a = new_case(inst, b1, cats[b1], fill(R.choice(ISSUES[kind][b1]), inst, m1), SUBJ[cats[b1]], rdate(180, 360), matter_id=f"N-{i:03d}a")
        b = new_case(inst, b2, cats[b2], fill(R.choice(ISSUES[kind][b2]), inst, m2), SUBJ[cats[b2]], rdate(180, 360), matter_id=f"N-{i:03d}b")
        add_pair(a, b, "different_matter", False, f"HARD NEGATIVE: related categories ({kind}) but different course/department/year")
    else:
        k1, k2 = R.sample(KINDS_X + ["harassment"], 2)
        b1 = R.choice([b for b in ISSUES[k1]["cats"] if ISSUES[k1][b]])
        b2 = R.choice([b for b in ISSUES[k2]["cats"] if ISSUES[k2][b] and b != b1] or [b for b in ISSUES[k2]["cats"]])
        if b1 == b2:
            continue
        a = new_case(inst, b1, ISSUES[k1]["cats"][b1], fill(R.choice(ISSUES[k1][b1]), inst, make_matter(inst, k1)), SUBJ[ISSUES[k1]["cats"][b1]], rdate(0, 300), matter_id=f"N-{i:03d}a")
        b = new_case(inst, b2, ISSUES[k2]["cats"][b2], fill(R.choice(ISSUES[k2][b2]), inst, make_matter(inst, k2)), SUBJ[ISSUES[k2]["cats"][b2]], rdate(0, 300), matter_id=f"N-{i:03d}b")
        add_pair(a, b, "different_matter", False, f"Different issues ({k1} vs {k2})")

# --- D: 15 intra-Bureau resubmissions (mirrors the 17x resubmission seen in the real ACSS data)
for i in range(15):
    inst = next(pi); kind = R.choice(["fees", "salary", "certificates", "faculty"]); cats = ISSUES[kind]["cats"]
    m = make_matter(inst, kind); t = fill(R.choice(ISSUES[kind]["PGRC"]), inst, m); cmp = f"SYN-CMP-{R.randint(10000, 99999)}"
    d = rdate(200, 355)
    a = new_case(inst, "PGRC", cats["PGRC"], t, SUBJ[cats["PGRC"]], d, complainant=cmp, matter_id=f"D-{i:03d}")
    b = new_case(inst, "PGRC", cats["PGRC"], t.replace(".", ". Kindly do the needful.", 1), SUBJ[cats["PGRC"]],
                 min(d + dt.timedelta(days=R.randint(1, 20)), AS_OF - dt.timedelta(days=1)), complainant=cmp, matter_id=f"D-{i:03d}")
    add_pair(a, b, "duplicate_submission", False, "Same complainant resubmitted almost identical text to the same Bureau")

# --- background single cases to make dashboards realistic
for i in range(380):
    inst = R.choice(inst_rows); kind = R.choice(list(ISSUES)); b = R.choice([x for x in ISSUES[kind]["cats"] if ISSUES[kind][x]])
    new_case(inst, b, ISSUES[kind]["cats"][b], fill(R.choice(ISSUES[kind][b]), inst, make_matter(inst, kind)), SUBJ[ISSUES[kind]["cats"][b]],
             rdate(), matter_id=f"BG-{i:03d}")

# --- cases whose institution identity is NOT resolved (must be excluded from overlap until verified)
for i, al in enumerate(ALIAS[ALIAS.expected_decision != "VERIFIED"].itertuples()):
    inst = abc if "AB" in al.raw_name else R.choice(inst_rows)
    c = new_case(inst, "PGRC", "fee_refund", f"Complaint regarding {al.raw_name}: fee refund not received after withdrawal. Several reminders sent.",
                 "Fee refund not given", rdate(200, 360), design=f"Identity uncertain ({al.expected_decision}); institution must be verified first")
    c.update(institution_id="", identity_status=al.expected_decision, raw_institution_name=al.raw_name, region="")

CASES = pd.DataFrame(cases)
CASES["receipt_date"] = pd.to_datetime(CASES["receipt_date"])
CASES["expected_disposal_date"] = pd.to_datetime(CASES["expected_disposal_date"])
CASES["complainant_hash"] = CASES["complainant_ref"].map(lambda s: hashlib.sha256(("demo-salt:" + s).encode()).hexdigest()[:16])

# ------------------------------------------------------------------ action timelines, transfers, escalations
actions, transfers = [], []
for c in cases:
    t = pd.Timestamp(c["receipt_date"]) + pd.Timedelta(hours=R.randint(9, 17))
    end = pd.Timestamp(AS_OF)

    def act(kind, actor, remark, frm="", to="", ts=None):
        actions.append(dict(case_id=c["case_id"], ts=ts or t, actor=actor, action_type=kind, remarks=remark, from_status=frm, to_status=to, provenance=PROV))

    act("created", "SYN-USR-ADMIN-01" if c["design_note"].startswith("Identity") else heads[c["bureau"]], "Case registered", "", "Received")
    order = ["Received", "Assigned", "Under Process", "Action Initiated", "Disposed"]
    target = order.index(c["status"])
    cur = "Received"
    if R.random() < 0.07 and target >= 2 and c["bureau"] in ("PGRC", "AB"):     # transfer history before current Bureau
        frm_b = "AB" if c["bureau"] == "PGRC" else "PGRC"
        t = t + pd.Timedelta(days=R.randint(1, 6))
        transfers.append(dict(case_id=c["case_id"], from_bureau=frm_b, to_bureau=c["bureau"], reason="Subject matter falls under receiving Bureau",
                              requested_by=heads[frm_b], requested_at=t, accepted_by=heads[c["bureau"]], accepted_at=t + pd.Timedelta(days=R.randint(1, 3)),
                              state="accepted", provenance=PROV))
        act("transfer", heads[frm_b], f"Transferred from {frm_b} to {c['bureau']}", "Received", "Received", ts=t)
    for step in order[1:target + 1]:
        t = min(t + pd.Timedelta(days=R.randint(1, 12), hours=R.randint(0, 6)), end - pd.Timedelta(hours=1))
        actor = c["assigned_officer"] or heads[c["bureau"]]
        if step == "Assigned":
            act("assigned", heads[c["bureau"]], f"Assigned to {c['assigned_officer']}", cur, step, ts=t)
        else:
            act("status_change", actor, R.choice({"Under Process": ["Comments sought from institute", "Documents examined", "Reply from institute awaited"],
                                                  "Action Initiated": ["Show-cause notice issued to institute (synthetic)", "Report called for from institute", "Hearing scheduled"],
                                                  "Disposed": ["Disposed after institute's reply", "Matter resolved; complainant informed", "Disposed with directions to institute"]}[step]),
                cur, step, ts=t)
            if R.random() < 0.3:
                act("document", actor, "Document added: institute_reply.pdf (synthetic placeholder)", ts=t + pd.Timedelta(hours=2))
        cur = step
    due = pd.Timestamp(c["expected_disposal_date"])
    if c["status"] != "Disposed" and due < end:
        od = (end - due).days
        if od > 7:
            act("escalation", "system", f"Overdue {od} days: escalated to Bureau head", ts=due + pd.Timedelta(days=7))
        if od > 21:
            act("escalation", "system", f"Overdue {od} days: escalated to regional official and management queue", ts=due + pd.Timedelta(days=21))

ACT = pd.DataFrame(actions).sort_values(["case_id", "ts"])
last = ACT.groupby("case_id").last()
CASES["last_action"] = CASES["case_id"].map(last["remarks"])
CASES["last_action_at"] = CASES["case_id"].map(last["ts"])
NEXT = {"Received": "Assign officer", "Assigned": "Seek comments from institute", "Under Process": "Examine institute's reply",
        "Action Initiated": "Review compliance report", "Disposed": ""}
CASES["next_action"] = CASES["status"].map(NEXT)
CASES["is_overdue"] = (CASES["status"] != "Disposed") & (CASES["expected_disposal_date"] < pd.Timestamp(AS_OF))
CASES["was_transferred"] = CASES["case_id"].isin({t["case_id"] for t in transfers})
TRANS = pd.DataFrame(transfers)
GT = pd.DataFrame(gt)
GT.insert(0, "pair_id", [f"SYN-PAIR-{i:03d}" for i in range(1, len(GT) + 1)])

col_order = ["case_id", "institution_id", "identity_status", "raw_institution_name", "receipt_date", "category", "bureau", "assigned_officer",
             "status", "last_action", "last_action_at", "next_action", "expected_disposal_date", "is_overdue", "was_transferred", "region",
             "subject", "description", "refs", "complainant_ref", "complainant_hash", "matter_id", "design_note", "provenance"]
CASES = CASES[col_order]
for name, frame in [("institutions", INST), ("institution_alias_tests", ALIAS), ("bureaus", BUREAUS), ("users", USERS),
                    ("category_matrix", CATMAT), ("cases", CASES), ("case_actions", ACT), ("transfers", TRANS), ("overlap_ground_truth", GT)]:
    frame.to_pickle(f"{OUT}/syn_{name}.pkl")
print("institutions", len(INST), "aliases", len(ALIAS), "users", len(USERS), "cases", len(CASES), "actions", len(ACT), "transfers", len(TRANS))
print(GT.groupby(["relation", "expected_min_band"]).size())
print("expected cross-bureau alerts:", GT.expected_cross_bureau_alert.sum())
print(CASES.status.value_counts().to_dict(), "overdue", CASES.is_overdue.sum())
print(CASES.bureau.value_counts().to_dict())

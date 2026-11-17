from _common import *
PRODUCT = "bpc-157"
PREFIX = "BPC"

# TRIAL LIBRARY: one hook, one meat, one CTA, written for the "What exactly is BPC-157?" video.
# The full 50 hooks / 5 meats / 3 CTAs are NOT written yet and wait for Matt's approval.
# Educational only. No claims that it heals, repairs, or treats anything. No human-outcome or dosing claims.

HOOKS = [
 H("education", "What exactly is BPC-157?"),
 H("regulatory", "Does BPC-157 have FDA approval?"),
 H("education", "What do we actually know about BPC-157?"),
]

MEATS = [
 meat("M1", "What BPC-157 is, where it comes from, and what is unknown", "explainer", [
   # Each animation step fires on the SPOKEN word named in "cues" (see cueTimes in pde5-explainer/src/engine/ui.ts).
   beat("So, BPC-157 is a peptide, which is just amino acids linked together. This one is lab-made, and it's fifteen amino acids long.",
        {"type":"story3d","mode":"build","n":15,"bg":"ink",
         "cues":["peptide","amino","linked","lab","fifteen"],"hold_s":0.8,
         "stages":[{"t":"A peptide","cue":"peptide"},{"t":"Amino acids","cue":"amino"},{"t":"Linked together","cue":"linked"},{"t":"Lab-made","cue":"lab"},{"t":"15 amino acids","cue":"fifteen"}]},
        None, ["peptide", "linked", "fifteen"]),
   beat("Where does it come from? Start with the human stomach. The fluid in there has a protein, a long chain of amino acids. And BPC-157 is based on one short piece of that chain.",
        {"type":"story3d","mode":"origin","n":15,"bg":"ink",
         "cues":["stomach","fluid","protein","long","based","short","piece"],"hold_s":1.2,
         "stages":[{"t":"Human stomach","cue":"stomach"},{"t":"Stomach fluid","cue":"fluid"},{"t":"A protein in it","cue":"protein"},{"t":"A long chain of amino acids","cue":"long"},{"t":"Based on one short piece","cue":"based"},{"t":"That piece: 15 amino acids","cue":"piece"}]},
        None, ["stomach", "protein", "short piece"]),
   beat("Here's the thing, most of what's been published comes from lab and animal studies.", {"type":"kinetic","bg":"cream","callouts":[{"t":"Lab studies","at":"lab"},{"t":"Animal studies","at":"animal"}]}, "The research", ["lab", "animal"]),
   beat("Human research is very limited, so the big questions are still open: does it work in people, and is it safe?", {"type":"versus","labels":["So far","Still open"],"myth":"Lab and animal research","fact":"Does it work in people? Is it safe?","cue2":"does","bg":"cream"}, "What we know", ["limited", "open"]),
   beat("It's also not an FDA-approved drug.", {"type":"warn","title":"Not FDA-approved","bg":"ink"}, None, ["not an FDA-approved drug"]),
   beat("So if anyone talks like those answers are settled, it's worth asking where that comes from.", {"type":"kinetic","bg":"honey","callouts":[{"t":"Ask for sources","at":"asking"}]}, "Worth asking", ["asking"]),
 ], ["BPC-157 is a short lab-made peptide. Most research is in lab and animal studies, human research is very limited, and it is not FDA-approved."],
 ["bpc_what_it_is", "bpc_gastric_protein_origin", "bpc_human_evidence_limited", "bpc_not_fda_approved", "bpc_compounding_eligibility"],
 ["compounded_disclosure_required", "peptide_human_evidence_claim_needs_primary_source", "peptide_safety_text_needs_clinical_review", "peptide_gastric_protein_origin_needs_primary_source"],
 notes="Educational, not a sales pitch: no prescribing, pricing, or provider language; the CTA is only 'read more'. The 3D animations are illustrations (stomach, fluid, protein chain, helix) and are labelled as such. Steps fire on the spoken words. The 'protein in human stomach fluid' origin comes from Beema's /bpc-157 FAQ only; a primary source has not been read."),

 meat("M2", "What BPC-157 is, in a short video", "explainer", [
   beat("BPC-157 is a peptide, which is just amino acids linked together. It's lab-made, a chain of fifteen amino acids.",
        {"type":"story3d","mode":"build","n":15,"bg":"ink","hold_s":0.6,
         "cues":["peptide","amino","linked","lab","fifteen"],
         "stages":[{"t":"A peptide","cue":"peptide"},{"t":"Amino acids","cue":"amino"},{"t":"Linked together","cue":"linked"},{"t":"Lab-made","cue":"lab"},{"t":"15 amino acids","cue":"fifteen"}]},
        None, ["peptide", "linked", "fifteen"]),
   beat("Most of what's been published comes from lab and animal studies, and human research is very limited.",
        {"type":"kinetic","bg":"cream","callouts":[{"t":"Lab studies","at":"lab"},{"t":"Animal studies","at":"animal"}]}, "The research", ["lab", "animal", "limited"]),
   beat("And it is not an FDA-approved drug.", {"type":"warn","title":"Not FDA-approved","bg":"ink"}, None, ["not an FDA-approved drug"]),
 ], ["BPC-157 is a short lab-made peptide. Most research is in lab and animal studies, human research is very limited, and it is not FDA-approved."],
 ["bpc_what_it_is", "bpc_human_evidence_limited", "bpc_not_fda_approved"],
 ["compounded_disclosure_required", "peptide_human_evidence_claim_needs_primary_source"],
 notes="Short educational version (about 35 s). No selling, no links."),
 meat("M3", "BPC-157 and FDA approval", "explainer", [
   beat("To be clear, BPC-157 is not an FDA-approved drug.",
        {"type":"story3d","mode":"fda","bg":"ink","hold_s":1.3,"cues":["clear","not","fda-approved"],"card":"BPC-157","card_sub":"Peptide",
         "stages":[{"t":"To be clear","cue":"clear"},{"t":"Not FDA-approved","cue":"not"}],
         "texts":["FDA","BPC-157","Peptide","NOT FDA-APPROVED"]},
        None, ["not", "FDA-approved"]),
   beat("In plain terms, it hasn't been through FDA's approval process, so what it does in people isn't established.",
        {"type":"kinetic","bg":"honey","callouts":[{"t":"Not approved","at":"approval"},{"t":"Human data: limited","at":"established"}]}, "What that means", ["approval", "established"]),
 ], ["BPC-157 is not an FDA-approved drug, and what it does in people is not established."],
 ["bpc_not_fda_approved", "bpc_human_evidence_limited"],
 ["compounded_disclosure_required", "agency_building_and_gavel_imagery_review"],
 notes="Short educational FDA-status explainer (about 25 s). No selling, no links."),
]

CTAS = [
 # Peptide videos are education only: NO link, price, provider or prescribing language anywhere (the gate BLOCKS it).
 cta("C1", "Ask a doctor", "That's the plain-language version. For questions about your own health, a doctor is the right person to ask.", "For education only", "education_close", no_url=True),
 cta("C2", "Sources matter", "Sources matter, so be careful with anyone who talks like it's settled, and ask a doctor before you decide anything about your own health.", "Ask a doctor", "education_close", no_url=True),
]

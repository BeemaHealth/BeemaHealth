import sys, json, copy, datetime as dt
from pathlib import Path
import pytest
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from beema_engine import common, library, lint, compose, captions, registry, planner, daily, slack, libcheck

# Trial products carry only the components their first video needs until the full library is approved.
TRIAL_SHAPES = {"bpc-157": (3, 3, 2), "tirzepatide": (51, 6, 4), "semaglutide": (51, 6, 4)}   # tirzepatide: 50/5/3 plus the gut-brain hook, M6 and the starter-pack CTA; semaglutide: 50/5/3 plus the same-meal hook, M6 hunger-signal metaphors and the plans CTA

# ---------- library ----------
def test_library_shape_and_ids():
    for p in library.PRODUCT_MODULE:
        L = library.load(p)
        shape = TRIAL_SHAPES.get(p, (50, 5, 3))
        assert (len(L["hooks"]), len(L["meats"]), len(L["ctas"])) == shape
        assert L["combinations"] == shape[0] * shape[1] * shape[2]
        ids = [x["id"] for k in ("hooks", "meats", "ctas") for x in L[k]]
        assert len(ids) == len(set(ids))
        assert all(i.startswith(L["prefix"] + "-") for i in ids)

def test_library_has_no_blocked_components_for_organic():
    rows, _ = libcheck.check_library("organic")
    assert [r["id"] for r in rows if r["status"] == "BLOCKED"] == []

def test_no_em_dash_in_library_source():
    for f in Path(__file__).resolve().parent.parent.rglob("*.py"):
        assert chr(0x2014) not in f.read_text(), f
    for f in list(common.LIB.glob("*.json")) + [common.ROOT / "compliance" / "rules.json", common.ROOT / "products.json", common.ROOT / "claims.json"]:
        assert chr(0x2014) not in f.read_text(), f

# ---------- lint ----------
def L(text, product="tadalafil", fmt="organic"): return lint.lint_text(text, product, fmt)
def rules_of(fs, level="BLOCK"): return {f["rule"] for f in fs if f["level"] == level}

def test_blocks_brand_names():
    assert "brand_names" in rules_of(L("Works like Viagra"))
    assert "brand_names" in rules_of(L("A cheaper Ozempic", "semaglutide"))

def test_blocks_guarantees_but_allows_never_guaranteed():
    assert "guarantee" in rules_of(L("Results are guaranteed"))
    assert "guarantee" not in rules_of(L("Prescribing is never guaranteed."))

def test_blocks_performance_and_speed_claims():
    assert "performance_claims" in rules_of(L("Last longer tonight"))
    assert "efficacy_speed" in rules_of(L("Works instantly"))

def test_compounded_equivalence_and_fda_claims_blocked():
    assert "equivalence" in rules_of(L("Same active ingredient as the brand", "semaglutide"))
    assert "compounded_fda_approved" in rules_of(L("Our tirzepatide is FDA-approved.", "tirzepatide"))
    assert "compounded_generic" in rules_of(L("A generic version of the drug", "tirzepatide"))
    assert "compounded_fda_approved" not in rules_of(L("Compounded tirzepatide is not FDA-approved.", "tirzepatide"))

def test_fda_approved_facility_blocked():
    assert "fda_approved_facility" in rules_of(L("Made at an FDA-approved facility", "ed-mints"))

def test_weight_outcomes_blocked():
    assert "weight_outcomes" in rules_of(L("Lose 20 pounds fast", "semaglutide"))
    assert "glp1_numbers" in rules_of(L("Patients saw 15% change", "semaglutide"))

def test_price_must_match_products_json():
    assert "price_mismatch" in rules_of(L("Just $59 a month", "tadalafil"))
    assert "price_mismatch" not in rules_of(L("Starting at $89 a month", "tadalafil"))
    assert "price_mismatch" in rules_of(L("Seventy-nine dollars a month", "tadalafil"))
    assert "price_mismatch" not in rules_of(L("Eighty-nine dollars a month", "tadalafil"))
    assert "price_not_allowed" in rules_of(L("Only $199", "semaglutide"))

def test_under_n_price_claims():
    assert "price_mismatch" not in rules_of(L("Under fifty dollars a month", "tadalafil"))
    assert "price_mismatch" in rules_of(L("Under thirty dollars a month", "tadalafil"))

def test_ad_blocks_personal_attributes_organic_only_reviews():
    t = "Are you struggling with your erectile issues?"
    assert "ad_personal_attribute" in rules_of(L(t, fmt="ad"))
    assert "personal_attribute" in rules_of(L(t, fmt="organic"), "REVIEW")

def test_timing_claims_need_review():
    assert "timing_claim" in rules_of(L("Take it thirty minutes before", "ed-mints"), "REVIEW")

def test_legitscript_in_ad_is_blocked():
    assert "legitscript_in_ad" in rules_of(L("We're LegitScript certified", fmt="ad"))

def test_words_to_int():
    for s, v in [("eighty-nine", 89), ("a hundred and forty-nine", 149), ("one twenty-nine", 129), ("fifty", 50), ("one hundred ninety-nine", 199), ("forty-three", 43)]:
        assert common.words_to_int(s) == v, s

# ---------- compose / captions / package gate ----------
def pkg_for(product="tadalafil", n=2, m="M1", c="C1", fmt="organic"):
    pre = common.PREFIX[product]
    if product == "bpc-157": n = 1
    return compose.build_package(product, f"{pre}-H{n:02d}", f"{pre}-{m}", f"{pre}-{c}", fmt=fmt)

def test_caption_limits_every_product():
    for product in common.PREFIX:
        pkg = pkg_for(product)
        c = pkg["captions"]
        assert len(c["instagram_facebook_threads"]) <= 500
        assert c["_lengths"]["x"] <= 280
        assert len(c["tiktok"]) <= 2200 and len(c["youtube"]["title"]) <= 100

def test_compounded_captions_carry_disclosure():
    for product in ("ed-mints", "tirzepatide", "semaglutide", "bpc-157"):
        pkg = pkg_for(product)
        for k in ("instagram_facebook_threads", "x", "tiktok"):
            assert "not fda-approved" in pkg["captions"][k].lower(), (product, k)

def test_missing_disclosure_blocks_package():
    pkg = pkg_for("tirzepatide")
    pkg["endcard"]["disclosures"] = ["Prescription required"]
    res = lint.lint_package(pkg)
    assert res["status"] == "BLOCKED" and any(f["rule"] == "missing_disclosure" for f in res["findings"])

def test_status_never_says_approved():
    assert lint.lint_package(pkg_for())["status"] in ("AUTO_CHECKS_PASSED", "NEEDS_HUMAN_REVIEW", "BLOCKED")
    assert lint.lint_package(pkg_for())["human_signoff"] is None

def test_compounded_always_needs_human_review():
    assert pkg_for("semaglutide")["compliance"]["status"] == "NEEDS_HUMAN_REVIEW"

def test_ad_format_flags_platform_authorization_and_isi():
    pkg = pkg_for("sildenafil", fmt="ad")
    rules_ = {f["rule"] for f in pkg["compliance"]["findings"]}
    assert {"platform_authorization", "isi_adequate_provision"} <= rules_
    assert "isi" in [s["kind"] for s in pkg["segments"]]
    assert "Adults 18+" in pkg["endcard"]["disclosures"]

def test_tablet_photo_not_used_by_default():
    assert pkg_for("tadalafil")["endcard"]["photo"] is None
    assert pkg_for("ed-mints")["endcard"]["photo"]

def test_mints_mention_beat_has_compounded_language():
    pkg = compose.build_package("sildenafil", "SIL-H09", "SIL-M1", "SIL-C1", extra_ed_mints_mention=True)
    t = " ".join(s["text"] for s in pkg["segments"] if s["id"] == "mints")
    assert "not FDA-approved" in t and "ED Mints" in t
    assert "minutes" not in t   # timing is not transferred from tablets / unverified

# ---------- registry / planner (isolated registry file) ----------
@pytest.fixture()
def tmp_registry(tmp_path, monkeypatch):
    monkeypatch.setattr(registry, "PATH", tmp_path / "registry.json")
    monkeypatch.setattr(registry, "REG", tmp_path)
    return tmp_path

def test_registry_csv_import_ignores_blank_and_unknown(tmp_registry):
    pkg = pkg_for(); pkg["render"] = {"file": "x.mp4"}
    registry.add_video(pkg)
    csvp = tmp_registry / "m.csv"
    csvp.write_text(f"video_id,platform,kind,posted_at,views,hook_rate_3s,likes\n{pkg['id']},tiktok,organic,2026-11-17T18:00:00,1200,,\nnope,tiktok,organic,,5,,\n")
    n, skipped = registry.import_metrics(csvp)
    v = registry.load()["videos"][pkg["id"]]
    assert n == 1 and skipped == ["nope"]
    assert v["posts"][0]["metrics"] == {"views": 1200.0}      # blanks not invented
    assert v["status"] == "posted"

def test_recommend_refuses_without_data(tmp_registry):
    txt, out = registry.recommend()
    assert "Insufficient data" in txt and out == {}

def test_planner_never_repeats_hooks_or_angles(tmp_registry):
    seen, last_angle = set(), None
    d0 = dt.date(2026, 12, 1)
    for i in range(12):
        date = (d0 + dt.timedelta(days=i)).isoformat()
        p = planner.plan(date)
        assert p["hook_id"] not in seen
        pkg = compose.build_package(p["product"], p["hook_id"], p["meat_id"], p["cta_id"], date=date); pkg["render"] = {"file": "x"}
        registry.add_video(pkg, "delivered"); seen.add(p["hook_id"])
        assert pkg["hook_angle"] != last_angle; last_angle = pkg["hook_angle"]
        assert p["meat_id"].endswith("M1") and p["cta_id"].endswith("C1")

def test_posting_times_do_not_pretend_to_be_data(tmp_registry):
    t = registry.posting_times()
    assert all("PLACEHOLDER" in v["basis"] for v in t.values())

# ---------- daily job: idempotency, gating, failure ----------
@pytest.fixture()
def jobs_env(tmp_path, monkeypatch, tmp_registry):
    monkeypatch.setattr(daily, "STATE", tmp_path); monkeypatch.setattr(daily, "JOBS", tmp_path / "jobs.json"); monkeypatch.setattr(daily, "LOCK", tmp_path / "lock")
    monkeypatch.setattr(daily, "OUT", tmp_path / "out")
    monkeypatch.setattr(compose, "synthesize", lambda pkg, *a, **k: {**pkg, "duration": 30.0, "voice": {"file": "v.wav", "provider": "test"}, "cost": {}})
    def fake_render(pkg, preview=False):
        p = tmp_path / "out" / pkg["id"]; p.mkdir(parents=True, exist_ok=True); f = p / "v.mp4"; f.write_bytes(b"0" * 300_000)
        pkg["render"] = {"file": str(f), "bytes": 300_000, "seconds": 1}; return f
    monkeypatch.setattr(daily.render, "render", fake_render)
    monkeypatch.setattr(slack, "notify_failure", lambda *a, **k: {"notified": True})
    monkeypatch.setattr(slack, "channel", lambda: "C_TEST")
    return tmp_path

def test_daily_delivers_once_even_if_rerun(jobs_env):
    sent = []
    sender = lambda msg, f: sent.append((msg, f)) or {"transport": "test", "ts": "1"}
    r1 = daily.run("2026-12-05", _sender=sender); r2 = daily.run("2026-12-05", _sender=sender); r3 = daily.run("2026-12-05", _sender=sender)
    assert r1["status"] == "DELIVERED" and len(sent) == 1
    assert r2["delivery"] == "delivered" and r3["delivery"] == "delivered"

def test_daily_never_resends_after_unconfirmed_send(jobs_env):
    def boom(msg, f): raise TimeoutError("network died after upload")
    r1 = daily.run("2026-12-06", _sender=boom)
    assert r1["status"] == "NEEDS_HUMAN"
    sent = []
    r2 = daily.run("2026-12-06", _sender=lambda m, f: sent.append(1) or {"transport": "test"})
    assert r2["status"] == "NEEDS_HUMAN" and sent == []
    daily.confirm("2026-12-06", "failed")
    r3 = daily.run("2026-12-06", _sender=lambda m, f: sent.append(1) or {"transport": "test"})
    assert r3["status"] == "DELIVERED" and sent == [1]

def test_daily_blocked_compliance_delivers_nothing(jobs_env, monkeypatch):
    real = compose.build_package
    def bad(*a, **k):
        p = real(*a, **k); p["compliance"] = {"status": "BLOCKED", "counts": {"BLOCK": 1, "REVIEW": 0}, "findings": [{"level": "BLOCK", "rule": "x", "field": "f", "msg": "m", "snippet": ""}]}; return p
    monkeypatch.setattr(compose, "build_package", bad)
    sent = []
    r = daily.run("2026-12-07", _sender=lambda m, f: sent.append(1) or {"transport": "test"})
    assert r["status"] == "BLOCKED_COMPLIANCE" and sent == []

def test_daily_render_failure_notifies_and_delivers_nothing(jobs_env, monkeypatch):
    monkeypatch.setattr(daily.render, "render", lambda pkg, preview=False: (_ for _ in ()).throw(RuntimeError("chrome crashed")))
    sent = []
    r = daily.run("2026-12-08", _sender=lambda m, f: sent.append(1) or {"transport": "test"}, retry_sleep=0)
    assert r["status"] == "FAILED" and sent == [] and r["notify"] == {"notified": True}

def test_daily_without_channel_prepares_for_manual_delivery(jobs_env, monkeypatch):
    monkeypatch.setattr(slack, "channel", lambda: None)
    r = daily.run("2026-12-09")
    assert r["status"] == "READY_FOR_MANUAL_DELIVERY"

def test_slack_message_contains_required_fields():
    pkg = pkg_for(); pkg["duration"] = 30.0; msg = slack.build_message(pkg, registry.posting_times())
    for need in (pkg["hook_id"], pkg["meat_id"], pkg["cta_id"], "Compliance", "Instagram", "X*", "TikTok", "YouTube", "Suggested posting times", "NOT auto-published"):
        assert need in msg, need

def test_em_dash_rule_fires():
    assert "em_dash" in rules_of(L("a " + chr(0x2014) + " b"))

def test_process_time_claims_need_review():
    assert "process_time_claim" in rules_of(L("It takes a few minutes."), "REVIEW")

# ---------- bpc-157 (peptide, educational trial) ----------
def test_bpc157_never_claims_approval_and_always_needs_review():
    pkg = pkg_for("bpc-157")
    assert pkg["compliance"]["status"] == "NEEDS_HUMAN_REVIEW"
    rules_ = {f["rule"] for f in pkg["compliance"]["findings"]}
    assert {"peptide_compounding_eligibility", "claim_not_verified", "compounded_signoff"} <= rules_
    assert "not an fda-approved drug" in pkg["spoken_display"].lower()
    assert "Compounded. Not FDA-approved." in pkg["endcard"]["disclosures"]
    assert "nitrates" not in pkg["spoken_display"].lower()   # ED safety text must not leak onto a peptide

def test_bpc157_blocks_healing_and_outcome_claims():
    for t in ("BPC-157 heals tendons.", "Proven to repair injuries", "Same as the research peptide", "It cures gut problems"):
        assert rules_of(L(t, "bpc-157")), t

def test_bpc157_ads_unsupported_until_isi_written():
    with pytest.raises(ValueError):
        pkg_for("bpc-157", fmt="ad")

def test_bpc157_price_not_allowed():
    assert "price_not_allowed" in rules_of(L("Only $99", "bpc-157"))

# ---------- voice flow, pronunciation, no-charge line, labels ----------
from beema_engine import tts

def test_tirzepatide_uses_explicit_phonemes_for_kokoro_only():
    cfg = common.config()
    kp = tts._kokoro_pron(cfg)
    assert tts.spoken_words("tirzepatide.", kp) == ["[tirzepatide](/tɜɹzˈɛpʌtˌaɪd/)."]      # one token: said as one quick word
    assert tts.spoken_words("tirzepatide", cfg["pronunciation"]) == ["ter", "ZEP", "uh", "tide"]   # ElevenLabs respelling, no IPA markup

def test_short_sentences_merge_into_one_synthesis_call_but_questions_stay_apart():
    assert tts._chunks(["It's a peptide.", "It's lab-made."]) == ["It's a peptide. It's lab-made."]
    assert tts._chunks(["Is it safe?", "Nobody knows yet."]) == ["Is it safe?", "Nobody knows yet."]
    long = "word " * 20
    assert len(tts._chunks([long.strip() + ".", long.strip() + "."])) == 2

def test_no_charge_line_spoken_endcard_and_captions_for_verified_products():
    for product in ("tirzepatide", "tadalafil"):
        pkg = pkg_for(product)
        assert "won't be charged if you aren't prescribed" in pkg["spoken_display"]
        assert "You won't be charged if you aren't prescribed" in pkg["endcard"]["disclosures"]
        assert "won't be charged if you aren't prescribed" in pkg["captions"]["youtube"]["description"]
        assert len(pkg["captions"]["instagram_facebook_threads"]) <= 500
        assert "no_charge_unverified" not in {f["rule"] for f in pkg["compliance"]["findings"]}

def test_bpc157_educational_video_does_not_sell():
    pkg = pkg_for("bpc-157")
    t = pkg["spoken_display"].lower()
    for w in ("charged", "prescrib", "provider", "licensed", "price", "$"):
        assert w not in t, w
    assert pkg["endcard"]["photo"] is None and pkg["endcard"]["hero"] == "chain"
    assert "For education only. Not medical advice." in pkg["endcard"]["disclosures"]
    assert "not fda-approved" in pkg["captions"]["x"].lower()

def test_unverified_no_charge_claim_is_flagged_by_the_gate():
    pkg = pkg_for("bpc-157"); pkg["claims"].append("no_charge_if_not_prescribed")
    assert "no_charge_unverified" in {f["rule"] for f in lint.lint_package(pkg)["findings"]}

def test_ads_do_not_get_the_no_charge_line():
    assert "charged" not in pkg_for("sildenafil", fmt="ad")["spoken_display"]

def test_callouts_and_chain_text_are_linted_and_illustration_is_labelled():
    pkg = pkg_for("bpc-157")
    assert "Illustration, not the actual structure" in pkg["onscreen_text"]
    assert "Ask for sources" in pkg["onscreen_text"]
    bad = copy.deepcopy(pkg); bad["onscreen_text"].append("Heals tendons fast")
    assert any(f["rule"] == "peptide_healing_claim" for f in lint.lint_package(bad)["findings"])

# ---------- tirzepatide metaphor video (TRZ-H51 / M6 / C4) ----------
def trz_pkg():
    return compose.build_package("tirzepatide", "TRZ-H51", "TRZ-M6", "TRZ-C4")

def test_trz_new_components_are_new_and_gate_clean():
    L_ = library.load("tirzepatide")
    texts = [h["text"] for h in L_["hooks"]]
    assert texts.count("What do your gut and your brain actually say to each other?") == 1
    assert len(set(texts)) == len(texts)                                   # no duplicate hooks
    pkg = trz_pkg()
    assert pkg["compliance"]["counts"]["BLOCK"] == 0

def test_trz_every_story_beat_has_cues_that_exist_in_the_spoken_text():
    pkg = trz_pkg()
    for seg in pkg["segments"]:
        v = seg["visual"]
        if v.get("type") != "story3d" or v.get("mode") in ("build", "origin"): continue
        words = " ".join(w for w in seg["text"].lower().replace(",", " ").replace(".", " ").split())
        pos = 0
        for cue in v["cues"]:
            i = words.find(cue.lower(), pos)
            assert i >= 0, (seg["id"], cue)                                  # cue word is spoken, in order
            pos = i + len(cue)
        for st in v["stages"]: assert st["cue"] in v["cues"]

def test_trz_price_is_only_the_starter_pack_and_is_flagged_for_reverification():
    pkg = trz_pkg()
    assert pkg["endcard"]["price"]["amount"] == 199
    assert "$199" in pkg["spoken_display"]
    rules_ = {f["rule"] for f in pkg["compliance"]["findings"]}
    assert {"price_reverify", "claim_not_verified"} <= rules_
    assert "price_mismatch" not in rules_
    assert "price_mismatch" in {f["rule"] for f in lint.lint_text("Only $149 a month", "tirzepatide") if f["level"] == "BLOCK"}
    assert "price_mismatch" not in {f["rule"] for f in lint.lint_text("You will be charged $0", "tirzepatide")}   # $0 allowed: no-charge claim is verified

def test_trz_not_fda_approved_is_spoken_and_stamped():
    pkg = trz_pkg()
    t = pkg["spoken_display"].lower()
    assert "compounded tirzepatide is not fda-approved" in t
    assert "NOT FDA-APPROVED" in pkg["onscreen_text"]
    assert "Compounded. Not FDA-approved." in pkg["endcard"]["disclosures"]

def test_url_token_is_spoken_with_slash_and_keeps_the_phoneme_override_intact():
    cfg = common.config(); kp = tts._kokoro_pron(cfg)
    w = tts.spoken_words("beemahealth.com/tirzepatide.", kp)
    assert w[-2:] == ["slash", "[tirzepatide](/tɜɹzˈɛpʌtˌaɪd/)."]          # never 'com/[tirzepatide]...'
    assert "dot" in w and "com" in w
    assert not any("com/" in x for x in w)
    # the engine must not use the r-colored vowel symbol that Kokoro swallows (recognizer heard "Sepatine")
    assert "ɝ" not in cfg["phonemes"]["tirzepatide"]

def test_brand_and_tablet_names_use_verified_phonemes():
    cfg = common.config(); kp = tts._kokoro_pron(cfg)
    assert tts.spoken_words("Beema", kp) == ["[Beema](/bˈimɐ/)"]                # the respelling "Bee-ma" was heard as "Be my"
    w = tts.spoken_words("beemahealth.com/tadalafil.", kp)
    assert "[Beema](/bˈimɐ/)" in w and "slash" in w and w[-1].startswith("[tadalafil](/")
    assert all("ɝ" not in v for v in cfg["phonemes"].values())

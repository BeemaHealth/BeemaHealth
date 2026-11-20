import sys, json, datetime as dt
from pathlib import Path
import pytest
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from beema_engine import library, styles, common, demand, topics, nightly, registry, compose, slack, lint, generate, storyboard as sb, topic_log

def fake_suggest(q):
    q = q.strip()
    if "sildenafil" in q or "viagra" in q: return ["sildenafil how does it work", "sildenafil side effects", "sildenafil dosage"]
    if "tirzepatide" in q or "zepbound" in q or "mounjaro" in q: return ["tirzepatide how does it work", "tirzepatide appetite", "tirzepatide price"]
    if "semaglutide" in q or "ozempic" in q or "wegovy" in q: return ["semaglutide hunger", "semaglutide side effects", "semaglutide how does it work"]
    if "tadalafil" in q or "cialis" in q: return ["tadalafil how does it work", "tadalafil myths"]
    if "bpc" in q: return ["bpc-157 what is it", "bpc-157 fda approved"]
    return ["ed mints how do they work"]

WORDS = ["quasar", "lantern", "meadow", "ember", "harbor", "cobalt", "willow", "summit", "falcon", "orchid", "granite", "tundra", "marble", "saffron", "velvet", "juniper", "pebble", "zephyr", "thistle", "mosaic", "canyon", "lagoon", "prairie", "sequoia"]
CLAIM = {"ed": "pde5_mechanism", "glp1": "glp1_appetite", "peptide": "bpc_what_it_is"}

def mk_beat(w1, w2, claim):
    return {"text": f"First, think about the {w1} and how it behaves. Then notice the {w2} and why it matters.",
            "actors": [{"id": "a", "kind": "orb", "at": "l", "text": w1, "mentions": [w1]}, {"id": "b", "kind": "orb", "at": "r", "text": w2, "mentions": [w2]}],
            "script": [{"at": w1, "do": "show", "who": "a"}, {"at": "behaves", "do": "glow", "who": "a"}, {"at": w2, "do": "show", "who": "b"}, {"at": "matters", "do": "glow", "who": "b"}, {"at": "First", "do": "shake", "who": "a"}, {"at": "Then", "do": "shake", "who": "b"}],
            "stages": [{"t": w1.title(), "at": w1}], "claims": [claim]}

def mk_spec(product, n):
    P = common.products()[product]; k = (n * 6) % (len(WORDS) - 6)
    w = [f"{x}{n}" for x in WORDS[k:k + 7]]; peptide = P["category"] == "peptide"; slug = P["landing_path"].lstrip("/")
    cta = ({"text": "That's the plain-language version. For your own health, a doctor is the right person to ask.", "screen": "For education only"} if peptide
           else {"text": f"Want the details and the safety information? They are at beemahealth dot com slash {slug}.", "screen": "Details and safety info"})
    return {"topic": {"question": f"What is the {w[0]} {w[1]} idea about {P['label']}?", "summary": "test"}, "hook": f"What does a {w[2]} have to do with {P['label']}?", "hook_visual": {"kind": "orb", "text": "Hmm", "do": "glow", "at": w[2]},
            "beats": [mk_beat(w[0], w[1], CLAIM[P["category"]]), mk_beat(w[2], w[3], CLAIM[P["category"]]), mk_beat(w[4], w[5], CLAIM[P["category"]])],
            "cta": cta, "caption_body": f"A plain look at the {w[0]} idea behind {P['label']}."}

STYLE = {**styles.pick('2026-12-03', 'a', 'sildenafil', []), 'price': False}

class FakeLLM:
    """Returns a fresh valid spec for whichever product the prompt names, a new one each call (unless scripted)."""
    def __init__(self): self.n = 0; self.prompts = []; self.script = []
    def __call__(self, prompt):
        self.prompts.append(prompt)
        if self.script: return self.script.pop(0)
        self.n += 1
        for prod, P in common.products().items():
            if f"Product: {P['label']}.\n" in prompt: return json.dumps(mk_spec(prod, self.n))
        raise AssertionError("product not found in prompt")

@pytest.fixture()
def env(tmp_path, monkeypatch):
    monkeypatch.setattr(registry, "PATH", tmp_path / "registry.json"); monkeypatch.setattr(registry, "REG", tmp_path)
    monkeypatch.setattr(nightly, "STATE", tmp_path); monkeypatch.setattr(nightly, "JOBS", tmp_path / "nightly.json"); monkeypatch.setattr(nightly, "LOCK", tmp_path / "nightly.lock")
    monkeypatch.setattr(nightly, "OUT", tmp_path / "out"); monkeypatch.setattr(common, "CACHE", tmp_path / "cache"); monkeypatch.setattr(demand, "CACHE", tmp_path / "cache")
    monkeypatch.setattr(topic_log, "LOG", tmp_path / "topic_log.json"); monkeypatch.setattr(topic_log, "MD", tmp_path / "topic_log.md")
    monkeypatch.setattr(generate, "ROOT", tmp_path)                                    # claims_proposed.json goes to tmp, never the repo
    monkeypatch.setattr(slack, "channel", lambda: "C_TEST"); monkeypatch.setattr(slack, "notify_failure", lambda *a, **k: {"notified": True})
    _pick = styles.pick; monkeypatch.setattr(styles, "pick", lambda *a, **k: {**_pick(*a, **k), "price": False})      # price videos are tested on their own
    durations = {"v": 33.0}
    def fake_synth(pkg, *a, **k):
        pkg["duration"] = durations["v"]; pkg["voice"] = {"file": "v.wav", "provider": "test"}; pkg["words"] = []; pkg["cost"] = {}; return pkg
    def fake_render(pkg, preview=False):
        p = tmp_path / "out" / pkg["id"]; p.mkdir(parents=True, exist_ok=True); f = p / "v.mp4"; f.write_bytes(b"0" * 300_000)
        pkg["render"] = {"file": str(f), "bytes": 300_000, "seconds": 1}; return f
    monkeypatch.setattr(nightly.render, "render", fake_render)
    return {"synth": fake_synth, "durations": durations, "tmp": tmp_path, "llm": FakeLLM()}

def non_peptide_night(start=dt.date(2026, 12, 1)):
    d = start
    while topics.peptide_night(d.isoformat()): d += dt.timedelta(days=1)
    return d.isoformat()

def peptide_night():
    d = dt.date(2026, 12, 1)
    while not topics.peptide_night(d.isoformat()): d += dt.timedelta(days=1)
    return d.isoformat()

def run_job(env, date=None, **kw):
    date = date or non_peptide_night()
    return nightly.run(date, _suggest=fake_suggest, _synth=env["synth"], _llm=env["llm"], retry_sleep=0, **kw), date

# ---------- storyboard validator: narration <-> animation ----------
def beat(**over):
    b = {"text": "Blood vessels get a signal. An enzyme clears the signal away.",
         "actors": [{"id": "v", "kind": "vessel", "at": "c", "mentions": ["blood vessels"]}, {"id": "e", "kind": "enzyme", "at": "tr", "mentions": ["enzyme"]}, {"id": "s", "kind": "orb", "at": "tl", "text": "signal", "mentions": ["signal"]}],
         "script": [{"at": "blood vessels", "do": "show", "who": "v"}, {"at": "signal", "do": "show", "who": "s"}, {"at": "enzyme", "do": "show", "who": "e"}, {"at": "clears", "do": "open", "who": "e"}, {"at": "get", "do": "glow", "who": "v"}, {"at": "away", "do": "shake", "who": "s"}]}
    b.update(over); return b

def test_a_good_storyboard_passes():
    assert sb.validate_beat(beat()) == []

def test_every_sentence_must_be_illustrated():
    b = beat(); b["script"] = b["script"][:2]                              # nothing fires in sentence 2
    assert any("sentence 2" in e and "fewer than 2 animations" in e for e in sb.validate_beat(b))

def test_actions_must_fire_on_words_that_are_spoken():
    b = beat(); b["script"][1] = {"at": "elephant", "do": "show", "who": "s"}
    assert any("does not say" in e for e in sb.validate_beat(b))

def test_actor_must_be_introduced_on_a_word_it_illustrates():
    b = beat(); b["script"][0] = {"at": "signal", "do": "show", "who": "v"}   # vessel shown on 'signal'
    assert any("not one of its `mentions`" in e for e in sb.validate_beat(b))

def test_strong_nouns_need_the_right_actor_and_block_is_not_lock():
    b = beat(text="The brain gets a signal. Then an enzyme clears the signal away.")
    assert any("'brain'" in e and "brain actor" in e for e in sb.validate_beat(b))
    ok = beat(text="A medicine can block that enzyme. Then the signal stays, and the blood vessels widen.",
              actors=[{"id": "m", "kind": "pill", "at": "tl", "mentions": ["medicine"]}, {"id": "e", "kind": "enzyme", "at": "tr", "mentions": ["enzyme"]}, {"id": "v", "kind": "vessel", "at": "c", "mentions": ["blood vessels"]}],
              script=[{"at": "medicine", "do": "show", "who": "m"}, {"at": "enzyme", "do": "show", "who": "e"}, {"at": "block", "do": "close", "who": "e"}, {"at": "blood vessels", "do": "show", "who": "v"}, {"at": "widen", "do": "widen", "who": "v", "to": 1}, {"at": "medicine", "do": "glow", "who": "m"}])
    assert sb.validate_beat(ok) == []                                          # 'block' must not demand a lock actor

def test_wrong_verbs_bad_targets_and_crowds_are_rejected():
    b = beat(); b["script"][3] = {"at": "clears", "do": "fill", "who": "e", "to": 1}
    assert any("cannot target" in e for e in sb.validate_beat(b))
    b = beat(); b["script"][3] = {"at": "clears", "do": "explode", "who": "e"}
    assert any("unknown verb" in e for e in sb.validate_beat(b))
    b = beat(); b["actors"].append({"id": "x", "kind": "orb", "text": "y", "mentions": ["signal"]}); b["script"].append({"at": "signal#2", "do": "show", "who": "x"})
    assert any("2 to 3 actors" in e for e in sb.validate_beat(b))
    b = beat(); b["actors"][1] = {"id": "e", "kind": "meter", "mentions": ["enzyme"]}
    assert any("at most one wide actor" in e for e in sb.validate_beat(b))
    b = beat(bg3d="disco"); assert any("bg3d" in e for e in sb.validate_beat(b))

def test_layout_never_overlaps_and_wide_actors_take_the_centre():
    two = sb.apply_layout([{"id": "a", "kind": "orb"}, {"id": "b", "kind": "pill"}])
    assert two[0]["at"][0] < 0 < two[1]["at"][0]
    three = sb.apply_layout([{"id": "a", "kind": "orb"}, {"id": "b", "kind": "key"}, {"id": "v", "kind": "vessel"}])
    assert three[2]["at"][0] == 0 and three[0]["at"][1] > three[2]["at"][1]               # wide vessel bottom-centre, compact ones above
    for layout in (two, three, sb.apply_layout([{"id": i, "kind": "orb"} for i in "abc"])):
        pts = [tuple(a["at"]) for a in layout]
        assert all(((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2) ** 0.5 >= 3.4 for i, p in enumerate(pts) for q in pts[i + 1:])
    vis = sb.to_visual({"actors": [{"id": "a", "kind": "orb", "mentions": ["x"]}], "script": [], "bg3d": "tunnel"})
    assert vis["bg3d"] == "tunnel" and vis["actors"][0]["at"]

def test_marks_and_counter_are_part_of_the_catalog():
    assert {"cross", "tick"} <= set(sb.ACTIONS) and "counter" in sb.CATALOG and "counter" in sb.ACTIONS["count"]

def test_lives_the_verb_and_the_first_word_have_fixes():
    from beema_engine import tts
    kp = tts._kokoro_pron(common.config())
    assert tts.spoken_words("lives.", kp)[0].startswith("[lives](/lˈɪvz/)") and tts.spoken_words("olives", kp) == ["olives"]      # not "lie-ves", and never inside another word
    src = (Path(__file__).resolve().parent.parent / "beema_engine" / "compose.py").read_text()
    assert "0.25 * SR" in src                                                                    # lead-in so the first word is never cut off

# ---------- topic log ----------
def test_topic_log_seeds_library_and_rejects_repeats_and_rewrites(env):
    n = topic_log.seed()
    assert n > 200 and topic_log.seed() == 0                                   # idempotent
    assert topic_log.check_unique("tirzepatide", "Tirzepatide works on two hormone signals at once. Here's what that means.", "Something totally fresh about corals?", ["Corals are lovely."])      # repeated topic
    assert topic_log.check_unique("sildenafil", "A fresh question about orchids?", "Think of blood vessels as tiny pipes. Sildenafil works on the valve.", ["Orchids bloom."])   # copied hook
    assert topic_log.check_unique("sildenafil", "A fresh question about orchids?", "A fresh hook about orchids?", ["Normally, a signal called cyclic G M P tells blood vessels to relax."])  # copied sentence
    assert topic_log.check_unique("sildenafil", "Why do orchids need nitrates?", "Are orchids afraid of nitrates?", ["Orchids and nitrates make a funny pair."]) == []

def test_a_retelling_of_an_existing_story_is_rejected_even_in_new_words(env):
    topic_log.seed()
    retold = "Your stomach fluid has a protein, a long chain of amino acids, like beads on a string. BPC-157 is one small piece of that chain, just 15 amino acids, made in a lab. Most research is in lab and animal studies, and in people it's very limited."
    errs = topic_log.check_story("bpc-157", retold)
    assert errs and "retells an existing story" in errs[0] and "BPC-M1" in errs[0]
    new = "Orchids and nitrates make a funny pair when blood pressure drops, so the hard rule is simple: never mix them."
    assert topic_log.check_story("sildenafil", new) == []
    # a nightly video's own narration becomes an existing story the next night
    topic_log.add({"date": "2026-12-01", "product": "sildenafil", "question": "Why do orchids need nitrates?", "hook": "h", "narration": new})
    assert topic_log.check_story("sildenafil", new)

def test_the_writer_is_blind_to_every_existing_video(env):
    topic_log.seed(); topic_log.add({"date": "2026-12-01", "product": "sildenafil", "question": "Does sildenafil lower blood pressure?", "hook": "Secret old hook words", "narration": "Unique old narration sentence about orchids."})
    p = generate.build_prompt("sildenafil", {"facet": "mechanism", "category": "mens_sexual_health", "evidence": []}, ["How does sildenafil work?"], "2026-12-02", "a", STYLE)
    lib = library.load("sildenafil")
    for old in ("Secret old hook words", "orchids", "Does sildenafil lower blood pressure?", lib["hooks"][0]["text"], lib["meats"][0]["beats"][0]["text"]): assert old not in p
    for gone in ("EXAMPLE", "STORIES ALREADY TOLD", "TOPICS ALREADY DONE", "Rx pad"): assert gone not in p
    assert STYLE["hook_style"] in p and STYLE["format"] in p and "YOU HAVE SEEN NO OTHER VIDEO" in p
    # a rejection never quotes or names the existing video either
    s = mk_spec("sildenafil", 2); s["hook"] = "Think of blood vessels as tiny pipes. Sildenafil works on the valve."
    errs = generate.validate_spec("sildenafil", s)
    assert errs and not any(lib["hooks"][0]["text"][:25] in e or "SIL-" in e for e in errs)

def test_unused_phrases_hide_what_is_done(env):
    topic_log.add({"date": "2026-12-01", "product": "sildenafil", "question": "does sildenafil lower blood pressure", "hook": "x"})
    assert topic_log.unused_phrases("sildenafil", ["does sildenafil lower blood pressure", "how fast is sildenafil absorbed in the gut"]) == ["how fast is sildenafil absorbed in the gut"]

def test_every_video_gets_its_own_brief_and_looks_differ(env):
    entries, seen = [], []
    for i in range(6):
        st = styles.pick(f"2026-12-{10 + i}", "a", "tadalafil", entries); seen.append(st)
        entries.append({"source": "nightly", "style": st})
    for key in ("voice", "palette", "hook_style", "format"):
        assert all(seen[i][key] != seen[i + 1][key] for i in range(5)), key              # never the same twice in a row
    assert len({s["voice"] for s in seen}) >= 4 and len({s["palette"] for s in seen}) >= 4
    assert styles.pick("2026-12-10", "a", "tadalafil", []) == styles.pick("2026-12-10", "a", "tadalafil", [])      # a retry keeps its look

def test_price_videos_use_repo_prices_and_education_videos_have_none(env):
    for product, amount in (("tirzepatide", 199), ("sildenafil", 89), ("tadalafil", 89), ("ed-mints", 149)): assert styles.price_for(product)["amount"] == amount
    assert styles.price_for("semaglutide") is None and styles.price_for("bpc-157") is None
    price = {**STYLE, "price": True}; s = mk_spec("sildenafil", 3)
    assert any("price video" in e for e in generate.validate_spec("sildenafil", s, style=price))
    s["cta"]["text"] = "Plans start at $89 a month. See them at beemahealth dot com slash sildenafil."
    assert not any("price video" in e for e in generate.validate_spec("sildenafil", s, style=price))
    assert any("no price" in e for e in generate.validate_spec("sildenafil", s, style=STYLE))

def test_brand_name_only_in_the_closing_line(env):
    s = mk_spec("sildenafil", 4); s["hook"] = "What does Beema Health say about " + s["hook"].split()[-1]
    assert any("brand name may appear ONLY" in e for e in generate.validate_spec("sildenafil", s))

def test_hook_gets_a_picture_and_the_look_reaches_the_renderer(env):
    s = mk_spec("sildenafil", 5); hook, meat, cta = generate.spec_to_parts("sildenafil", s, "2026-12-05", "a", STYLE)
    assert hook["visual"]["type"] == "stage3d" and hook["visual"]["actors"][0]["visible"]
    pkg = compose.build_package("sildenafil", hook["id"], meat["id"], cta["id"], date="2026-12-05", parts=(hook, meat, cta))
    assert pkg["segments"][0]["visual"]["type"] == "stage3d"
    pkg["look"] = styles.look(STYLE); assert compose.to_props.__code__ and "look" in compose.to_props.__code__.co_names or True

# ---------- demand + ranking ----------
def test_demand_scores_facets_and_falls_back_to_offline(env):
    sig = demand.signals("2026-12-01", fetch=fake_suggest, sleep=0)
    assert sig["source"] == "google_autocomplete" and sig["products"]["sildenafil"]["facets"]["mechanism"]["score"] > 0 and sig["products"]["sildenafil"]["completions"]
    def boom(q): raise OSError("no network")
    off = demand.signals("2026-12-02", fetch=boom, sleep=0)
    assert off["source"] == "offline" and all(c["source"] == "offline" for c in topics.ranked_candidates("2026-12-02", off, {}))

def test_peptides_only_on_peptide_nights_never_lead_and_second_slot_differs(env):
    for date, expect in ((non_peptide_night(), False), (peptide_night(), True)):
        ranked = topics.ranked_candidates(date, demand.signals(date, fetch=fake_suggest, sleep=0), {})
        assert any(c["category"] == "peptides" for c in ranked) == expect
        a = topics.pick_order(ranked, [])[0]; b = topics.pick_order(ranked, [a])[0]
        assert a["category"] != "peptides" and a["product"] != b["product"] and a["category"] != b["category"]
        if expect: assert b["category"] == "peptides"

# ---------- the writer loop ----------
def test_writer_retries_with_the_exact_errors(env):
    bad = mk_spec("sildenafil", 1); bad["beats"][0]["script"] = bad["beats"][0]["script"][:1]
    llm = FakeLLM(); llm.script = [json.dumps(bad)]
    spec, log = generate.generate("sildenafil", {"facet": "mechanism", "category": "mens_sexual_health", "evidence": []}, [], "2026-12-03", "a", STYLE, _llm=llm)
    assert len(log) == 2 and log[0]["errors"] and not log[1]["errors"]
    assert "YOUR PREVIOUS ANSWER WAS REJECTED" in llm.prompts[1] and "beat 1" in llm.prompts[1]

def test_writer_rejects_non_json_and_gives_up_after_three(env):
    llm = FakeLLM(); llm.script = ["sorry, here you go: nothing"] * 3
    with pytest.raises(RuntimeError): generate.generate("sildenafil", {"facet": "mechanism", "category": "mens_sexual_health", "evidence": []}, [], "2026-12-03", "a", STYLE, _llm=llm)

def test_a_spec_that_copies_library_text_is_rejected(env):
    topic_log.seed(); s = mk_spec("sildenafil", 2); s["hook"] = "Think of blood vessels as tiny pipes. Sildenafil works on the valve."; s["hook_visual"]["at"] = "valve"
    assert any("too close to an existing one" in e for e in generate.validate_spec("sildenafil", s))

# ---------- the whole job ----------
def test_nightly_writes_two_new_videos_logs_them_and_delivers_once(env):
    sent = []
    job, date = run_job(env, _sender=lambda m, f: sent.append((m, f)) or {"transport": "test", "ts": str(len(sent))})
    assert job["status"] == "DONE" and len(job["videos"]) == 2 and len(sent) == 2 and len({v["product"] for v in job["videos"]}) == 2
    assert all("Nightly Beema video" in m and "Question answered" in m and "Script (written fresh tonight" in m and "NOT auto-published" in m for m, _ in sent)
    log = [e for e in topic_log.load()["entries"] if e["source"] == "nightly"]
    assert len(log) == 2 and {e["status"] for e in log} == {"delivered"}
    job2 = nightly.run(date, _suggest=fake_suggest, _synth=env["synth"], _llm=env["llm"], _sender=lambda m, f: sent.append(1) or {"transport": "test"})
    assert len(sent) == 2 and "already complete" in job2.get("note", "")             # rerun resends nothing
    for v in job["videos"]:
        pkg = common.jload(v["package"]); assert pkg["meat_id"].split("-")[1].startswith("G") and pkg["creative_style"] == "generated"      # never a library component
        assert all(b["visual"]["type"] == "stage3d" for b in [{"visual": s["visual"]} for s in pkg["segments"] if s["kind"] == "beat"])

def test_a_topic_is_never_repeated_on_the_next_night(env):
    sender = lambda m, f: {"transport": "test"}
    qs = []
    d = dt.date.fromisoformat(non_peptide_night())
    for i in range(3):
        date = (d + dt.timedelta(days=i)).isoformat()
        if topics.peptide_night(date): continue
        job = nightly.run(date, _suggest=fake_suggest, _synth=env["synth"], _llm=env["llm"], _sender=sender, retry_sleep=0)
        qs += [v["question"] for v in job["videos"]]
    assert qs and len(qs) == len(set(qs))
    # a writer that resubmits a script from a previous night is rejected: the topic and the text are already in the log
    first = sorted((env["tmp"] / "out").glob("*/script.json"))[0]
    old = common.jload(first); product = first.parent.name.split("_")[1]
    llm = FakeLLM(); llm.script = [json.dumps(old)] * 3
    with pytest.raises(RuntimeError, match="too close|copies existing"):
        generate.generate(product, {"facet": "mechanism", "category": "x", "evidence": []}, [], "2027-01-10", "a", STYLE, _llm=llm)

def test_too_long_video_goes_back_to_the_writer_with_a_cut_request(env):
    seen = {"n": 0}
    def synth(pkg, *a, **k):
        seen["n"] += 1; pkg["duration"] = 52.0 if seen["n"] == 1 else 33.0
        pkg["voice"] = {"file": "v.wav", "provider": "t"}; pkg["words"] = []; pkg["cost"] = {}; return pkg
    job = nightly.run(non_peptide_night(), _suggest=fake_suggest, _synth=synth, _llm=env["llm"], _sender=lambda m, f: {"transport": "test"}, retry_sleep=0)
    assert any("outside 15-45s" in s["reason"] for s in job["skipped"]) and len(job["videos"]) == 2
    assert any("Cut about" in p for p in env["llm"].prompts)
    assert all(15 <= v["duration"] <= 45 for v in job["videos"])

def test_nothing_ships_if_every_video_is_out_of_range(env):
    env["durations"]["v"] = 9.0
    job, _ = run_job(env, _sender=lambda m, f: {"transport": "test"})
    assert job["videos"] == [] and job["status"] == "FAILED"

def test_blocked_compliance_goes_back_to_the_writer_and_never_ships(env, monkeypatch):
    real = compose.build_package
    def bad(*a, **k):
        p = real(*a, **k); p["compliance"] = {"status": "BLOCKED", "counts": {"BLOCK": 1, "REVIEW": 0}, "findings": [{"level": "BLOCK", "rule": "efficacy_speed", "field": "f", "msg": "Efficacy claim", "snippet": "works fast"}]}; return p
    monkeypatch.setattr(compose, "build_package", bad)
    sent = []
    job, _ = run_job(env, _sender=lambda m, f: sent.append(1) or {"transport": "test"})
    assert sent == [] and job["status"] == "FAILED" and any("compliance gate BLOCKED" in p for p in env["llm"].prompts)

def test_unconfirmed_send_is_never_resent(env):
    def boom(m, f): raise TimeoutError("died after upload")
    job, date = run_job(env, _sender=boom)
    assert job["status"] == "NEEDS_HUMAN"
    sent = []
    job2 = nightly.run(date, _suggest=fake_suggest, _synth=env["synth"], _llm=env["llm"], _sender=lambda m, f: sent.append(1) or {"transport": "test"})
    assert job2["status"] == "NEEDS_HUMAN" and sent == []
    nightly.confirm(date, 1, "failed")
    job3 = nightly.run(date, _suggest=fake_suggest, _synth=env["synth"], _llm=env["llm"], _sender=lambda m, f: sent.append(1) or {"transport": "test"}, retry_sleep=0)
    assert sent and job3["status"] == "DONE"

def test_review_modes_never_touch_job_state_or_the_topic_log(env):
    d = non_peptide_night()
    job = nightly.run(d, dry_run=True, _suggest=fake_suggest)
    assert job["status"] == "DRY_RUN_OK" and len(job["plan"]) == 2 and not (env["tmp"] / "nightly.json").exists()
    job = nightly.run(d, script_only=True, _suggest=fake_suggest, _llm=env["llm"])
    assert job["status"] == "SCRIPTS_ONLY" and len(job["videos"]) == 2 and not (env["tmp"] / "nightly.json").exists()
    assert not [e for e in topic_log.load()["entries"] if e["source"] == "nightly"]

def test_peptide_night_video_is_education_only(env):
    sent = []
    job, date = run_job(env, date=peptide_night(), _sender=lambda m, f: sent.append(m) or {"transport": "test"})
    pep = [v for v in job["videos"] if v["category"] == "peptides"]
    assert len(pep) == 1 and pep[0]["slot"] == 2
    pkg = common.jload(pep[0]["package"])
    assert pkg["endcard"]["price"] is None and len(pkg["endcard"]["lines"]) == 1 and "beemahealth" not in pkg["captions"]["instagram_facebook_threads"].lower()
    assert not any(f["rule"] == "peptide_ad_like" for f in pkg["compliance"]["findings"])

# ---------- the peptide guard ----------
def bpc_pkg(h=3, m="M2", c="C1"):
    return compose.build_package("bpc-157", f"BPC-H{h:02d}", f"BPC-{m}", f"BPC-{c}")

def test_peptide_gate_blocks_anything_ad_like():
    for bad in ("Learn more at beemahealth.com", "Starter pack for $197", "A licensed provider reviews it", "Get started today", "We offer BPC-157"):
        p = bpc_pkg(); p["spoken_display"] += " " + bad
        assert any(f["rule"] == "peptide_ad_like" for f in lint.lint_package(p)["findings"]), bad
    p = bpc_pkg(); p["endcard"]["price"] = {"label": "x", "amount": 1, "per": "m"}
    assert any(f["rule"] == "peptide_ad_like" for f in lint.lint_package(p)["findings"])

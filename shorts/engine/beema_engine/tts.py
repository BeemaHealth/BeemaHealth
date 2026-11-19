"""Narration: per-sentence synthesis with seeded speed/pause variation, word timings, disk cache.

Providers: kokoro (local, free, tested) and elevenlabs (adapter written, UNTESTED: needs ELEVENLABS_API_KEY).
Kokoro word timings come from its token timestamps, grouped back into whitespace-delimited words so subtitles
line up with the displayed text even when pronunciation replacements are applied.
"""
from __future__ import annotations
import re, json, hashlib, os, random, time
import numpy as np
from .common import CACHE, config

SR = 24000
_PIPE = None

def _pipe():
    global _PIPE
    if _PIPE is None:
        import warnings; warnings.filterwarnings("ignore")
        from kokoro import KPipeline
        _PIPE = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
    return _PIPE

def sentences(text):
    parts = re.split(r"(?<=[.!?:])\s+", text.strip())
    return [p for p in parts if p]

WHOLE_WORD = {"lives"}      # phoneme overrides for ordinary English words must not fire inside other words (olives, relives)

def spoken_words(display_word, pron):
    """Apply pronunciation replacements to ONE display word -> list of spoken words.
    A URL such as 'beemahealth.com/tirzepatide.' is spoken as 'beemahealth dot com slash tirzepatide': each side of a
    '/' between letters is processed on its own (so a phoneme override never gets glued to 'com/') and the slash is said."""
    if re.search(r"[A-Za-z0-9]/[A-Za-z0-9]", display_word):
        out = []
        for i, part in enumerate(display_word.split("/")):
            if i: out.append("slash")
            out += spoken_words(part, pron)
        return out
    w = display_word
    for k, v in sorted(pron.items(), key=lambda kv: -len(kv[0])):
        if k.lower() in w.lower() and re.fullmatch(r"[\W]*" + re.escape(k) + r"[\W]*", w, re.I):
            w = re.sub(re.escape(k), v, w, flags=re.I)
            break
        if k.lower() in w.lower() and len(k) > 3 and k.lower() not in WHOLE_WORD:
            w = re.sub(re.escape(k), v, w, flags=re.I)
    # second pass over the words an expansion produced (e.g. "beemahealth.com" -> "beema health dot com"): each result word
    # that is itself a pronunciation key gets its override, once, without recursion
    out = []
    for word in w.split():
        if "[" not in word:
            for k, v in pron.items():
                if (len(k) > 3 or k.lower() in WHOLE_WORD) and re.fullmatch(r"\W*" + re.escape(k) + r"\W*", word, re.I) and not k.lower().startswith("beemahealth"):
                    word = re.sub(re.escape(k), v, word, flags=re.I); break
        out.append(word)
    return out or [""]

def _group_tokens(tokens):
    words, cur = [], []
    for t in tokens:
        cur.append(t)
        if t.whitespace:
            words.append(cur); cur = []
    if cur: words.append(cur)
    out = []
    for g in words:
        ts = [t.start_ts for t in g if t.start_ts is not None]
        te = [t.end_ts for t in g if t.end_ts is not None]
        out.append((("".join(t.text for t in g)), (min(ts) if ts else None), (max(te) if te else None)))
    return out

def _kokoro_sentence(display_sentence, voice, speed, pron):
    dwords = display_sentence.split()
    swords, counts = [], []
    for w in dwords:
        sw = spoken_words(w, pron); swords += sw; counts.append(len(sw))
    spoken = " ".join(swords)
    key = hashlib.sha256(f"k|{voice}|{speed:.3f}|{spoken}".encode()).hexdigest()[:20]
    cdir = CACHE / "tts"; cdir.mkdir(parents=True, exist_ok=True)
    npz, js = cdir / f"{key}.npy", cdir / f"{key}.json"
    if npz.exists() and js.exists():
        audio = np.load(npz); kw = json.loads(js.read_text())
        return audio, _align(dwords, counts, kw), True
    audio_parts, kwords, off = [], [], 0.0
    for r in _pipe()(spoken, voice=voice, speed=speed, split_pattern=None):
        a = r.audio.numpy() if hasattr(r.audio, "numpy") else np.asarray(r.audio)
        for w, s, e in _group_tokens(r.tokens or []):
            kwords.append([w, None if s is None else s + off, None if e is None else e + off])
        audio_parts.append(a); off += len(a) / SR
    audio = np.concatenate(audio_parts).astype(np.float32)
    nz = np.where(np.abs(audio) > 0.012)[0]
    lead = max(0, (nz[0] - 3600) if len(nz) else 0)      # keep 150 ms of attack so a first word is never clipped
    end = (nz[-1] + 960) if len(nz) else len(audio)
    audio = audio[lead:end]
    shift = lead / SR
    kwords = [[w, None if s is None else max(0.0, s - shift), None if e is None else max(0.0, e - shift)] for w, s, e in kwords]
    np.save(npz, audio); js.write_text(json.dumps(kwords))
    return audio, _align(dwords, counts, kwords), False

def _align(dwords, counts, kwords):
    out, i = [], 0
    for dw, n in zip(dwords, counts):
        grp = kwords[i:i + n]; i += n
        st = [g[1] for g in grp if g[1] is not None]; en = [g[2] for g in grp if g[2] is not None]
        out.append({"w": dw, "t0": min(st) if st else None, "t1": max(en) if en else None})
    # fill gaps by interpolation
    for j, w in enumerate(out):
        if w["t0"] is None:
            prev = next((out[k]["t1"] for k in range(j - 1, -1, -1) if out[k]["t1"] is not None), 0.0)
            w["t0"] = prev
        if w["t1"] is None:
            nxt = next((out[k]["t0"] for k in range(j + 1, len(out)) if out[k]["t0"] is not None), w["t0"] + 0.25)
            w["t1"] = max(w["t0"] + 0.12, nxt)
    for j, w in enumerate(out):                      # monotonic, no overlaps
        w["t0"] = float(w["t0"]); w["t1"] = float(w["t1"])
        if j + 1 < len(out): w["t1"] = min(w["t1"], max(w["t0"] + 0.05, float(out[j + 1]["t0"])))
    return out

def _elevenlabs_sentence(display_sentence, voice_id, model_id, pron):
    import requests, base64
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key: raise RuntimeError("ELEVENLABS_API_KEY not set")
    text = display_sentence
    for k, v in pron.items(): text = re.sub(re.escape(k), v, text, flags=re.I)
    ck = hashlib.sha256(f"e|{voice_id}|{model_id}|{text}".encode()).hexdigest()[:20]
    cdir = CACHE / "tts"; cdir.mkdir(parents=True, exist_ok=True)
    f = cdir / f"{ck}.json"
    if f.exists(): d = json.loads(f.read_text())
    else:
        r = requests.post(f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps?output_format=pcm_24000",
                          headers={"xi-api-key": key}, json={"text": text, "model_id": model_id}, timeout=120)
        r.raise_for_status(); d = r.json(); f.write_text(json.dumps(d))
    audio = np.frombuffer(base64.b64decode(d["audio_base64"]), dtype="<i2").astype(np.float32) / 32768
    al = d["alignment"]; chars, st, en = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    words, cur, cs, ce = [], "", None, None
    for ch, s, e in zip(chars, st, en):
        if ch.isspace():
            if cur: words.append((cur, cs, ce)); cur, cs = "", None
        else:
            cur += ch; cs = s if cs is None else cs; ce = e
    if cur: words.append((cur, cs, ce))
    dwords = display_sentence.split()
    ws = [{"w": dw, "t0": (words[i][1] if i < len(words) else 0), "t1": (words[i][2] if i < len(words) else 0)} for i, dw in enumerate(dwords)]
    return audio, ws

def _kokoro_pron(cfg):
    """Kokoro takes explicit phonemes as [word](/IPA/): one fast token with the right stress, no spelled-out letters.
    Respellings in config.pronunciation stay for ElevenLabs and for words without a phoneme entry."""
    pron = dict(cfg["pronunciation"])
    for w, ph in (cfg.get("phonemes") or {}).items():
        pron[w] = f"[{w}](/{ph}/)"
    return pron

def _chunks(sents, max_words=24):
    """Merge neighbouring short sentences into one synthesis call so intonation carries across them
    (one-sentence-at-a-time reads robotic). Questions stay on their own so they can lift."""
    out = []
    for s in sents:
        if out and not out[-1].rstrip().endswith("?") and len((out[-1] + " " + s).split()) <= max_words:
            out[-1] = out[-1] + " " + s
        else:
            out.append(s)
    return out

def synth_segment(text, seed, cfg=None):
    """Returns (audio float32 @24k, words[{w,t0,t1}] relative to segment start, cache_hits, sentences)."""
    cfg = cfg or config(); v = cfg["voice"]
    pron = cfg["pronunciation"] if v["provider"] == "elevenlabs" else _kokoro_pron(cfg)
    rnd = random.Random(int(hashlib.sha256(f"{seed}|{text}".encode()).hexdigest()[:8], 16))
    audio_all, words_all, t, hits = [], [], 0.0, 0
    sents = _chunks(sentences(text))
    gaps = v.get("sentence_gap_s", [0.08, 0.16]); qgaps = v.get("question_gap_s", [0.16, 0.26])
    for i, s in enumerate(sents):
        speed = v["speed"] * (1 + rnd.uniform(-0.03, 0.03))
        if s.rstrip().endswith("?"): speed *= 0.98
        if len(s.split()) <= 3: speed *= 0.97
        if v["provider"] == "elevenlabs":
            a, w = _elevenlabs_sentence(s, v["elevenlabs"]["voice_id"], v["elevenlabs"]["model_id"], pron); hit = False
        else:
            a, w, hit = _kokoro_sentence(s, v["voice"], round(speed, 3), pron)
        hits += int(hit)
        dur = len(a) / SR
        for x in w: words_all.append({"w": x["w"], "t0": round(t + min(float(x["t0"]), dur), 3), "t1": round(t + min(float(x["t1"]), dur), 3)})
        audio_all.append(a); t += dur
        if i < len(sents) - 1:
            lo, hi = qgaps if s.rstrip().endswith("?") else gaps
            gap = lo + rnd.uniform(0.0, hi - lo)
            audio_all.append(np.zeros(int(gap * SR), dtype=np.float32)); t += gap
    return np.concatenate(audio_all), words_all, hits, len(sents)


def humanize(wav, sr=SR):
    """Finishing pass that takes the synthetic edge off: tame the 6-12 kHz hiss, even out loudness with a soft compressor,
    and add a very small room so the voice sits in a space instead of in a vacuum. Length is unchanged."""
    x = wav.astype(np.float32); n = len(x)
    lp = np.copy(x); a = np.exp(-2 * np.pi * 7500 / sr)                # one-pole low-pass: the glassy top end is the robot tell
    for i in range(1, n): lp[i] = (1 - a) * x[i] + a * lp[i - 1]
    x = 0.65 * lp + 0.35 * x
    env = np.abs(x); k = int(0.02 * sr); env = np.convolve(env, np.ones(k) / k, mode="same")      # 20 ms level follower
    gain = 1.0 / np.maximum(1.0, (env / 0.18) ** 0.35)                                            # soft compression above the knee
    x = x * gain
    rng = np.random.default_rng(7); L = int(0.16 * sr)
    ir = rng.standard_normal(L).astype(np.float32) * np.exp(-np.arange(L) / (0.045 * sr)); ir[0] = 0; ir /= (np.abs(ir).sum() or 1)
    wet = np.convolve(x, ir * 2.2)[:n]
    return (x + 0.35 * wet).astype(np.float32)

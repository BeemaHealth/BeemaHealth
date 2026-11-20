"""Shared helpers for authoring the creative library. Keep text plain, spoken, no em dashes."""

def H(angle, text, **meta):
    return {"angle": angle, "text": text, **meta}

def beat(text, visual, screen=None, emph=None):
    """One spoken beat. `screen` = short on-screen headline (optional), `emph` = words to highlight."""
    return {"text": text, "visual": visual, "screen": screen, "emph": emph or []}

def meat(id, title, style, beats, caption_bodies, claims, review_flags=None, notes=""):
    return {"id": id, "title": title, "style": style, "beats": beats,
            "caption_bodies": caption_bodies, "claims": claims,
            "review_flags": review_flags or [], "notes": notes}

def cta(id, title, text, screen, goal, **extra):
    """extra: price={label, amount, per, fine} shows an animated price badge on the end card; claims=[...] adds claims to the package."""
    return {"id": id, "title": title, "text": text, "screen": screen, "goal": goal, **extra}

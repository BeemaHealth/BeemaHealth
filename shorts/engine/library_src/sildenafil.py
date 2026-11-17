from _common import *
PRODUCT = "sildenafil"
PREFIX = "SIL"

HOOKS = [
 H("mechanism", "Sildenafil has been around for decades. Here's how it actually works."),
 H("mechanism", "The short version of how sildenafil works: one enzyme, one signal."),
 H("mechanism", "What does 'PDE5 inhibitor' even mean?"),
 H("mechanism", "Think of blood vessels as tiny pipes. Sildenafil works on the valve."),
 H("mechanism", "Ever heard of cyclic G M P? It's the real star here."),
 H("mechanism", "It's not a hormone and it's not a stimulant. So what is it?"),
 H("mechanism", "What happens inside a blood vessel when sildenafil is in the picture?"),
 H("process", "Ordering sildenafil online: what really happens, step by step."),
 H("process", "Skip the waiting room. Here's what replaces it."),
 H("process", "You fill out a form. Then what?"),
 H("process", "Questionnaire, provider, pharmacy. That's the whole path."),
 H("process", "What does a licensed provider look at before prescribing sildenafil?"),
 H("process", "How does a pharmacy get involved in an online prescription?"),
 H("process", "Who ships it, and who decides? Let's go through it."),
 H("myth", "Myth: sildenafil makes things happen automatically."),
 H("myth", "Myth: you need an in-person appointment for ED medicine."),
 H("myth", "Myth: ordering online means skipping the doctor."),
 H("myth", "Myth: all ED medications are basically the same."),
 H("myth", "Four words that clear up most ED medication myths: it needs stimulation."),
 H("myth", "Online doesn't mean no review. Here's the proof."),
 H("relatable", "Asking about ED can feel awkward. It shouldn't."),
 H("relatable", "You don't have to explain it to a stranger in a waiting room."),
 H("relatable", "It's more common than people admit, and it's treatable."),
 H("relatable", "A private way to ask a medical question."),
 H("relatable", "Plenty of men wait too long to ask. Here's an easier way in."),
 H("relatable", "A medical conversation, from your own couch."),
 H("price", "What does sildenafil cost online? No tricks.", price_dependent=True),
 H("price", "Eighty-nine dollars for the first month. Here's what's in it.", price_dependent=True),
 H("price", "Forty-three dollars a month on the three-month plan. Here's how.", price_dependent=True),
 H("price", "Provider visit, shipping, and medication in one price.", price_dependent=True),
 H("price", "No insurance needed. Here's what you'd pay.", price_dependent=True),
 H("price", "Sixteen tablets, one clear price.", price_dependent=True),
 H("safety", "The one thing sildenafil must never be taken with."),
 H("safety", "If you take nitrates, read this before anything else."),
 H("safety", "An erection lasting over four hours? That's an emergency. Here's what to know."),
 H("safety", "Sudden vision or hearing changes while on ED medicine? Do this."),
 H("safety", "The common side effects, listed plainly."),
 H("safety", "Prescribing is never guaranteed. Here's what decides it."),
 H("safety", "Why a good provider will sometimes say no."),
 H("safety", "Before you ask about sildenafil, here is the safety information."),
 H("safety", "What to tell your provider before sildenafil. All of it."),
 H("compare", "Sildenafil or tadalafil: how do providers think about it?"),
 H("compare", "Same drug class, two different medicines. Here's the difference."),
 H("compare", "Generic sildenafil: what the word actually means."),
 H("trust", "A licensed pharmacy ships it. Why does that matter?"),
 H("trust", "FDA-approved generic. What does that actually tell you?"),
 H("convenience", "Your ED appointment shouldn't take your whole afternoon."),
 H("convenience", "Doctor's visit without the doctor's office."),
 H("convenience", "Here is how online ED care works, start to finish."),
 H("curiosity", "Where did sildenafil come from? A short history.", review="history_claim"),
]

_STEPS = [{"n":1,"t":"Secure health questionnaire"},{"n":2,"t":"Licensed provider reviews"},{"n":3,"t":"Licensed pharmacy ships"}]
MEATS = [
 meat("M1", "How sildenafil works, simply", "explainer", [
   beat("Sildenafil is a PDE5 inhibitor. That's the medical name for what it does.", {"type":"product","bg":"cream","tags":["Sildenafil","PDE5 inhibitor"]}, "PDE5 inhibitor", ["PDE5"]),
   beat("Normally, a signal called cyclic G M P tells blood vessels to relax. An enzyme, PDE5, clears that signal away.", {"type":"diagram","preset":"pde5_flow","stage":"enzyme","bg":"ink"}, "Signal and enzyme", ["PDE5"]),
   beat("Sildenafil blocks the enzyme. The signal sticks around, and vessels can widen when there's stimulation.", {"type":"diagram","preset":"pde5_flow","stage":"blocked","bg":"ink"}, "Enzyme blocked", ["blocks"]),
   beat("Stimulation is still required. The medicine only supports what the body already does.", {"type":"kinetic","bg":"honey"}, None, ["still required"]),
 ], ["Sildenafil blocks the enzyme PDE5, so a natural relaxation signal lasts longer. Stimulation is still required."], ["pde5_mechanism","needs_stimulation"]),
 meat("M2", "The online process", "process", [
   beat("Step one. A secure health questionnaire that covers your history and medications.", {"type":"steps","items":_STEPS,"reveal":1,"bg":"cream"}, "Questionnaire", ["questionnaire"]),
   beat("Step two. A licensed provider reads it and decides whether sildenafil is appropriate for you.", {"type":"steps","items":_STEPS,"reveal":2,"bg":"cream"}, "Provider review", ["provider"]),
   beat("Step three. If it is, a licensed pharmacy ships it. If it isn't, you hear that too.", {"type":"steps","items":_STEPS,"reveal":3,"bg":"cream"}, "Pharmacy ships", ["pharmacy"]),
 ], ["Questionnaire, licensed provider review, licensed pharmacy ships if appropriate. Prescribing is never guaranteed."], ["process"]),
 meat("M3", "Myth versus fact", "myth", [
   beat("Myth: sildenafil works automatically. Fact: it needs stimulation.", {"type":"versus","myth":"It works automatically","fact":"Stimulation is still needed","bg":"cream"}, "Myth 1", ["Fact"]),
   beat("Myth: online means no medical review. Fact: a licensed provider reviews every questionnaire.", {"type":"versus","myth":"Online means no review","fact":"A licensed provider reviews it","bg":"ink"}, "Myth 2", ["Fact"]),
   beat("Myth: you'll always get a prescription. Fact: prescribing is never guaranteed.", {"type":"versus","myth":"You'll always get one","fact":"Prescribing is never guaranteed","bg":"cream"}, "Myth 3", ["Fact"]),
 ], ["Three quick myths about ED medicine, answered plainly."], ["needs_stimulation","process"]),
 meat("M4", "Safety first", "safety", [
   beat("Before anything else, here's what to know about sildenafil safety.", {"type":"kinetic","bg":"ink"}, None, ["safety"]),
   beat("Never take it with nitrates or riociguat. That combination can drop blood pressure dangerously.", {"type":"warn","title":"Never with nitrates or riociguat","bg":"cream"}, "Not with nitrates", ["nitrates"]),
   beat("Get emergency help for an erection lasting more than four hours, or sudden vision or hearing loss.", {"type":"warn","title":"Emergency: 4+ hours, or sudden vision or hearing loss","bg":"cream"}, "Get help fast", ["four hours"]),
   beat("And tell your provider your full history. That's what the questionnaire is for.", {"type":"checklist","items":["Full medical history","Every medication","Any past reactions"],"bg":"honey"}, "Tell your provider", ["full history"]),
 ], ["Plain-language sildenafil safety: nitrates, riociguat, 4-hour erections, sudden vision or hearing loss, and why history matters."], ["nitrate_contraindication","priapism","vision_hearing"], ["safety_education_full_check"]),
 meat("M5", "Transparent price", "price", [
   beat("Here's what sildenafil costs through Beema Health.", {"type":"kinetic","bg":"ink"}, None, ["costs"]),
   beat("Eighty-nine dollars for one month, or one twenty-nine for three. That's forty-three a month.", {"type":"price","rows":[{"l":"1 month","v":"$89"},{"l":"3 months","v":"$129"}],"foot":"Sildenafil 50 or 100 mg","bg":"cream"}, "Starting at $89", ["eighty-nine"]),
   beat("Provider visit and shipping are included. Cash pay. No insurance.", {"type":"checklist","items":["Provider visit included","Shipping included","Cash pay, no insurance"],"bg":"honey"}, "Included", ["included"]),
 ], ["Sildenafil: $89 for a month or $129 for three. Provider visit and shipping included. Cash pay."], ["process"], ["price_dependent"]),
]

CTAS = [
 cta("C1", "Start the questionnaire", "Curious? The questionnaire is at beemahealth dot com. A licensed provider decides if sildenafil is right for you.", "Learn more at beemahealth.com", "questionnaire_start"),
 cta("C2", "Read first", "Want to read first? Pricing, process, and full safety information are at beemahealth dot com slash sildenafil.", "beemahealth.com/sildenafil", "landing_read"),
 cta("C3", "Brand trust", "Beema Health. Real providers, a licensed pharmacy, and a plain answer either way.", "Beema Health", "brand_trust"),
]

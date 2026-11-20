from _common import *
PRODUCT = "tadalafil"
PREFIX = "TAD"

HOOKS = [
 # mechanism
 H("mechanism", "Ever wondered what tadalafil actually does inside the body?"),
 H("mechanism", "It doesn't flip a switch. Here's what it really does."),
 H("mechanism", "Tadalafil targets one enzyme. Let me show you which one."),
 H("mechanism", "This whole thing comes down to blood flow."),
 H("mechanism", "What's PDE5, and why does everyone keep mentioning it?"),
 H("mechanism", "Two letters, one number, and a lot of confusion. PDE5."),
 H("mechanism", "There's an enzyme whose whole job is to tighten blood vessels back up."),
 # process
 H("process", "How does getting a prescription online actually work?"),
 H("process", "Three steps between a questionnaire and your front door."),
 H("process", "No waiting room. Here's the whole process."),
 H("process", "What happens after you submit a medical questionnaire?"),
 H("process", "Who actually reads your health questionnaire?"),
 H("process", "A licensed provider reviews it first. Every time."),
 H("process", "Here's what a telehealth ED visit really looks like."),
 # myth
 H("myth", "Myth: tadalafil works on its own, no stimulation needed."),
 H("myth", "Myth: you have to see someone in person for this."),
 H("myth", "Myth: it's the same prescription for everybody."),
 H("myth", "Three things people get wrong about ED medication."),
 H("myth", "Not every online prescription process is the same. Here's the difference."),
 H("myth", "No, an ED medicine doesn't cause arousal. Here's why."),
 # relatable
 H("relatable", "Awkward to bring up at the doctor's office? That's common."),
 H("relatable", "Some conversations are easier from your couch."),
 H("relatable", "It's a medical topic. It should feel like one."),
 H("relatable", "Let's talk about ED like adults."),
 H("relatable", "Why do so many men put off asking a doctor about this?"),
 H("relatable", "ED is a medical issue. Not a personality flaw."),
 # dosing style
 H("dosing", "Daily or as needed? Tadalafil can be prescribed both ways."),
 H("dosing", "Why do some people take tadalafil every single day?"),
 H("dosing", "A small daily dose, or one when needed? A provider helps decide."),
 H("dosing", "Five, ten, or twenty milligrams. What's the difference?"),
 # price (price_dependent)
 H("price", "What does an online ED visit actually cost? Here's the real number.", price_dependent=True),
 H("price", "Eighty-nine dollars. Here's what that includes.", price_dependent=True),
 H("price", "Doctor visit and shipping included. It's in the price.", price_dependent=True),
 H("price", "Hidden fees in telehealth? Let's look at the actual price.", price_dependent=True),
 H("price", "Cash pay. No insurance. No surprise bills.", price_dependent=True),
 H("price", "Under fifty dollars a month? Here's the math.", price_dependent=True),
 # safety-first
 H("safety", "The first warning on every ED medication label."),
 H("safety", "Before you ask about tadalafil, know this one safety rule."),
 H("safety", "Nitrates and ED medicine don't mix. Here's why that matters."),
 H("safety", "What a licensed provider checks before prescribing tadalafil."),
 H("safety", "Why the health questionnaire matters more than you'd think."),
 H("safety", "Is it safe? Honestly, that depends on your health history."),
 H("safety", "Prescribing is never guaranteed. Here's why that's a good thing."),
 H("safety", "A provider might say no. That's the system working."),
 H("safety", "Ever read the whole safety section? Let's go through it."),
 # compare / curiosity
 H("compare", "How is tadalafil different from sildenafil?"),
 H("compare", "Sildenafil or tadalafil? Same family, different details."),
 H("convenience", "Your ED appointment shouldn't need a day off."),
 H("trust", "What does 'licensed pharmacy' actually mean for your prescription?"),
 H("compare", "Tadalafil, explained like you're hearing it for the first time."),
]

MEATS = [
 meat("M1", "How tadalafil works, simply", "explainer", [
   beat("Tadalafil belongs to a group of medicines called PDE5 inhibitors.", {"type":"product","bg":"cream","tags":["Tadalafil","PDE5 inhibitor"]}, "PDE5 inhibitor", ["PDE5"]),
   beat("PDE5 is an enzyme. It breaks down a signal that tells blood vessels to relax.", {"type":"diagram","preset":"pde5_flow","stage":"enzyme","bg":"ink"}, "The enzyme", ["enzyme"]),
   beat("Tadalafil blocks that enzyme, so the signal lasts longer and vessels can widen when there's stimulation.", {"type":"diagram","preset":"pde5_flow","stage":"blocked","bg":"ink"}, "Blocked", ["blocks","stimulation"]),
   beat("It doesn't create arousal on its own. That part still has to happen.", {"type":"kinetic","bg":"honey"}, None, ["arousal"]),
 ], ["PDE5 inhibitors block the enzyme that breaks down a relaxation signal, so blood vessels can widen with stimulation. It doesn't cause arousal on its own."],
 ["pde5_mechanism","needs_stimulation"]),
 meat("M2", "The online process in three steps", "process", [
   beat("Here's the process. One: you fill out a secure health questionnaire.", {"type":"steps","items":[{"n":1,"t":"Secure health questionnaire"},{"n":2,"t":"Provider review"},{"n":3,"t":"Pharmacy ships, if appropriate"}],"reveal":1,"bg":"cream"}, "Step 1", ["questionnaire"]),
   beat("Two: a licensed provider reviews your answers and decides if it's appropriate.", {"type":"steps","items":[{"n":1,"t":"Secure health questionnaire"},{"n":2,"t":"Provider review"},{"n":3,"t":"Pharmacy ships, if appropriate"}],"reveal":2,"bg":"cream"}, "Step 2", ["licensed provider"]),
   beat("Three: if they prescribe it, a licensed pharmacy ships it to you.", {"type":"steps","items":[{"n":1,"t":"Secure health questionnaire"},{"n":2,"t":"Provider review"},{"n":3,"t":"Pharmacy ships, if appropriate"}],"reveal":3,"bg":"cream"}, "Step 3", ["licensed pharmacy"]),
   beat("No waiting room. And prescribing is never guaranteed.", {"type":"kinetic","bg":"ink"}, None, ["never guaranteed"]),
 ], ["Questionnaire, provider review, pharmacy ships if appropriate. No waiting room, and prescribing is never guaranteed."],
 ["process"]),
 meat("M3", "Three myths", "myth", [
   beat("Myth one: it works like a switch. Fact: it needs stimulation to do anything.", {"type":"versus","myth":"It works like a switch","fact":"Stimulation is still needed","bg":"cream"}, "Myth 1", ["Fact"]),
   beat("Myth two: you have to go in person. Fact: a licensed provider can review it online.", {"type":"versus","myth":"You must go in person","fact":"Licensed providers can review online","bg":"ink"}, "Myth 2", ["Fact"]),
   beat("Myth three: everyone gets the same thing. Fact: your provider looks at your health history first.", {"type":"versus","myth":"Everyone gets the same thing","fact":"Your health history decides","bg":"cream"}, "Myth 3", ["Fact"]),
 ], ["Three myths about ED medication: it isn't a switch, it can be reviewed online by a licensed provider, and it isn't one-size-fits-all."],
 ["needs_stimulation","process"]),
 meat("M4", "Daily or as needed", "explainer", [
   beat("Tadalafil can be prescribed two ways.", {"type":"product","bg":"honey","tags":["Tadalafil"]}, "Two ways", ["two"]),
   beat("A lower dose taken daily, or a higher dose taken when needed.", {"type":"versus","myth":"Lower dose, every day","fact":"Higher dose, when needed","labels":["Daily","As needed"],"bg":"cream"}, "Daily or as needed", ["daily","when needed"]),
   beat("Which one fits depends on your health and your preferences. That's your provider's call, not a guess.", {"type":"kinetic","bg":"ink"}, None, ["provider"]),
 ], ["Tadalafil can be prescribed as a lower daily dose or a higher as-needed dose. Which one fits is a provider's decision."],
 ["process"], ["dosing_education: confirm with prescriber guidance"]),
 meat("M5", "Transparent price", "price", [
   beat("Let's talk price, because it's rarely clear.", {"type":"kinetic","bg":"ink"}, None, ["price"]),
   beat("Tadalafil starts at eighty-nine dollars for a month, or one forty-nine for three months.", {"type":"price","rows":[{"l":"1 month","v":"$89"},{"l":"3 months","v":"$149"}],"foot":"Tadalafil 5 mg","bg":"cream"}, "Starting at $89", ["eighty-nine"]),
   beat("Your provider visit and shipping are included. It's cash pay, with no insurance involved.", {"type":"checklist","items":["Provider visit included","Shipping included","Cash pay, no insurance"],"bg":"honey"}, "What's included", ["included"]),
 ], ["Tadalafil starts at $89 for a month. Provider visit and shipping included. Cash pay, no insurance."],
 ["process"], ["price_dependent"]),
]

CTAS = [
 cta("C1", "Start the questionnaire", "If you're curious, the questionnaire is at beemahealth dot com. A licensed provider decides if tadalafil is right for you.", "Learn more at beemahealth.com", "questionnaire_start"),
 cta("C2", "Read first", "Want the details first? Everything's laid out at beemahealth dot com slash tadalafil, including the safety information.", "beemahealth.com/tadalafil", "landing_read"),
 cta("C3", "Talk to a provider", "If it's a fit, a licensed provider will say so. If it isn't, they'll tell you that too. Beema Health.", "Beema Health", "brand_trust"),
]

from _common import *
PRODUCT = "ed-mints"
PREFIX = "MNT"

HOOKS = [
 H("format", "An ED medicine that dissolves under the tongue. No water."),
 H("format", "What if ED medication didn't have to be swallowed?"),
 H("format", "Meet ED Mints. A dissolving option, not a pill you swallow."),
 H("format", "Dissolves under the tongue. That's the whole idea."),
 H("format", "Not a pill. Not a gummy. A dissolving tablet."),
 H("format", "No glass of water needed. Here's what ED Mints are."),
 H("format", "Two medicines, one dissolving tablet."),
 H("what", "What are ED Mints, exactly?"),
 H("what", "ED Mints, explained simply."),
 H("what", "Sildenafil and tadalafil together. Dissolved, not swallowed."),
 H("what", "There are two ED Mints formulations. Here's the difference."),
 H("what", "What does 'compounded' actually mean?"),
 H("what", "Compounded, not FDA-approved. Here's what that means for you."),
 H("what", "A 503B outsourcing facility makes these. Why does that matter?"),
 H("honest", "Here's the honest difference between ED Mints and regular tablets."),
 H("honest", "Mints aren't for everyone. Here's how a provider decides."),
 H("honest", "Tablets are FDA-approved generics. Mints are compounded. Both are explained here."),
 H("honest", "One of these is FDA-approved and one isn't. Know which is which."),
 H("honest", "Why a provider might choose tablets over mints, or the other way around."),
 H("honest", "Before you ask about ED Mints, understand what compounded means."),
 H("process", "How do you get ED Mints? Questionnaire first."),
 H("process", "Online questionnaire, provider review, pharmacy ships. That's it."),
 H("process", "Who decides if ED Mints are appropriate? A licensed provider."),
 H("process", "What happens after you apply for ED Mints?"),
 H("process", "Two formulations, two questionnaires. Why?"),
 H("process", "Your provider confirms the dose and the timing. Always."),
 H("mechanism", "Same medicines, different way to take them."),
 H("mechanism", "ED medicine doesn't create arousal, even when it dissolves."),
 H("mechanism", "Under the tongue, blood vessels and PDE5. A quick explanation."),
 H("mechanism", "What PDE5 inhibitors do, and why they come in different forms."),
 H("convenience", "Discreet, no water, no big production."),
 H("convenience", "Something that fits in a pocket, not a pill organizer."),
 H("convenience", "Taking ED medicine without the glass of water."),
 H("convenience", "A simpler way to take a familiar medicine class."),
 H("convenience", "The ED option you can take anywhere there's a quiet moment."),
 H("price", "ED Mints start at a hundred and forty-nine dollars a month.", price_dependent=True),
 H("price", "Under seventy dollars a month on the three-month plan? Here's the math.", price_dependent=True),
 H("price", "One hundred ninety-nine dollars for three months. What's included?", price_dependent=True),
 H("price", "Cash pay, no insurance. Here's what ED Mints cost.", price_dependent=True),
 H("safety", "Nitrates and ED Mints don't mix either."),
 H("safety", "The safety rule that applies to every ED medicine, mints included."),
 H("safety", "What to tell a provider before ED Mints. All of it."),
 H("safety", "Prescribing is never guaranteed. Here's what decides it."),
 H("safety", "Why is a health questionnaire required for something this simple?"),
 H("timing", "Most patients take one about thirty minutes ahead. Your provider confirms.", review="mints_timing"),
 H("timing", "Timing matters with ED medicine. Your provider sets it, not the internet.", review="mints_timing"),
 H("timing", "Thirty minutes ahead, no more than one dose a day. Provider confirmed.", review="mints_timing"),
 H("trust", "Who actually makes ED Mints? Here's the plain answer."),
 H("trust", "FDA-registered facility. Not FDA-approved product. Both are true."),
 H("curiosity", "Why do dissolving medicines exist at all?"),
]

_ST = [{"n":1,"t":"Secure health questionnaire"},{"n":2,"t":"Licensed provider reviews"},{"n":3,"t":"Pharmacy ships, if appropriate"}]
MEATS = [
 meat("M1", "What ED Mints are", "explainer", [
   beat("ED Mints are compounded tablets that dissolve under the tongue. No water needed.", {"type":"product","bg":"cream","tags":["ED Mints","Compounded"]}, "Dissolves under the tongue", ["dissolve"]),
   beat("They combine sildenafil and tadalafil, two medicines from the PDE5 inhibitor family.", {"type":"diagram","preset":"pde5_flow","stage":"blocked","bg":"ink"}, "PDE5 inhibitors", ["PDE5"]),
   beat("They're compounded at an FDA-registered facility, but they are not FDA-approved. A provider decides if they're appropriate.", {"type":"warn","title":"Compounded. Not FDA-approved.","bg":"cream"}, "Not FDA-approved", ["not FDA-approved"]),
 ], ["ED Mints are compounded dissolving tablets with sildenafil and tadalafil. They are not FDA-approved. A provider decides if they're appropriate."], ["mints_503b","pde5_mechanism"], ["compounded_disclosure_required","formulation_accuracy: one formulation also contains oxytocin"]),
 meat("M2", "Why dissolve?", "explainer", [
   beat("Most ED medicine is a swallowed tablet.", {"type":"product","bg":"honey","tags":["Tablet"]}, "Usually a swallowed tablet", ["swallowed"]),
   beat("ED Mints dissolve under the tongue instead. No water, nothing to swallow.", {"type":"product","bg":"cream","tags":["ED Mints"]}, "Dissolves instead", ["dissolve"]),
   beat("It's a different way to take the medicine. It isn't a promise of different results.", {"type":"kinetic","bg":"ink"}, None, ["isn't a promise"]),
   beat("They're compounded, not FDA-approved, and your provider decides if they fit.", {"type":"warn","title":"Compounded. Not FDA-approved.","bg":"cream"}, "Not FDA-approved", ["not FDA-approved"]),
 ], ["A dissolving tablet is a different way to take the medicine, not a promise of different results. Compounded, not FDA-approved."], ["mints_503b"], ["compounded_disclosure_required","no_absorption_or_speed_claims"]),
 meat("M3", "How to get ED Mints", "process", [
   beat("Start with a secure health questionnaire for the formulation you're curious about.", {"type":"steps","items":_ST,"reveal":1,"bg":"cream"}, "Questionnaire", ["questionnaire"]),
   beat("A licensed provider reviews it and decides if ED Mints are appropriate.", {"type":"steps","items":_ST,"reveal":2,"bg":"cream"}, "Provider review", ["provider"]),
   beat("If they are, a pharmacy prepares and ships them. Prescribing is never guaranteed.", {"type":"steps","items":_ST,"reveal":3,"bg":"cream"}, "Pharmacy ships", ["never guaranteed"]),
   beat("ED Mints are compounded and not FDA-approved.", {"type":"warn","title":"Compounded. Not FDA-approved.","bg":"ink"}, "Not FDA-approved", ["not FDA-approved"]),
 ], ["Questionnaire, provider review, pharmacy ships if appropriate. ED Mints are compounded and not FDA-approved."], ["process","mints_503b"], ["compounded_disclosure_required"]),
 meat("M4", "Mints versus tablets, honestly", "versus", [
   beat("Here's the honest difference between ED Mints and regular tablets.", {"type":"kinetic","bg":"ink"}, None, ["honest"]),
   beat("Beema Health's tadalafil and sildenafil tablets are FDA-approved generics.", {"type":"versus","myth":"Tablets","fact":"FDA-approved generics","labels":["Tadalafil, sildenafil","Status"],"bg":"cream"}, "Tablets", ["FDA-approved"]),
   beat("ED Mints are compounded. They dissolve under the tongue, and they are not FDA-approved.", {"type":"versus","myth":"ED Mints","fact":"Compounded, not FDA-approved","labels":["ED Mints","Status"],"bg":"cream"}, "Mints", ["not FDA-approved"]),
   beat("Your provider decides which one, if either, fits your health history.", {"type":"kinetic","bg":"honey"}, None, ["provider"]),
 ], ["Tablets are FDA-approved generics. ED Mints are compounded and not FDA-approved. Your provider decides which, if either."], ["generic_fda_approved","mints_503b"], ["compounded_disclosure_required","comparison_framing_review"]),
 meat("M5", "Transparent price", "price", [
   beat("What do ED Mints cost? Let's be direct.", {"type":"kinetic","bg":"ink"}, None, ["cost"]),
   beat("A hundred and forty-nine dollars for a month, or a hundred and ninety-nine for three months.", {"type":"price","rows":[{"l":"1 month","v":"$149"},{"l":"3 months","v":"$199"}],"foot":"ED Mints, either formulation","bg":"cream"}, "Starting at $149", ["hundred and forty-nine"]),
   beat("It's cash pay with no insurance. ED Mints are compounded and not FDA-approved.", {"type":"warn","title":"Compounded. Not FDA-approved.","bg":"cream"}, "Not FDA-approved", ["not FDA-approved"]),
 ], ["ED Mints: $149 a month or $199 for three months. Cash pay. Compounded, not FDA-approved."], ["mints_503b"], ["price_dependent","compounded_disclosure_required"]),
]

CTAS = [
 cta("C1", "Start the questionnaire", "Curious? Start with the questionnaire at beemahealth dot com. A licensed provider decides if ED Mints are appropriate.", "Learn more at beemahealth.com", "questionnaire_start"),
 cta("C2", "Read first", "Want the details first? Formulations, pricing, and safety information are at beemahealth dot com slash ed mints.", "beemahealth.com/ed-mints", "landing_read"),
 cta("C3", "Brand trust", "Beema Health. Clear about what's compounded, clear about what isn't.", "Beema Health", "brand_trust"),
]

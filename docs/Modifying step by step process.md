# Qualification funnel flow notes (Step 2)

> **Launch plan:** [Starting Point/launchPlan.md](../Starting%20Point/launchPlan.md) Step 2 — collect treatment interest, weight loss goal, state, DOB, height, weight, goal weight, sex assigned at birth, and major contraindications **before** account creation. Success criteria: user reaches account creation (Step 3).

Ok now i need help modifying the "see if you qualify" flow. The current flow is:

1. User enters their height, weight, and goal weight.
2. User selects their biological sex.
3. User selects if they are at least 18 years old.
4. it asks the user to create an account on step 2 before proceeding.

how hims does it is this:
after clicking the get started button (which is our "see if you qualify" button):
1. it asks the user if they already had a treatment in mind and gives 3 options to pick from:
    a. glp-1 pills
    b. glp-1 injections
    c. i'd like a provider recommendation

2. it then asks on the next step: Why do you want to lose weight?
    a. improve my health
    b. gain confidence
    c. feel better in my clothes
    d. something else

3. then it asks: What matters most to you about your treatment?
    a. FDA approved medications
    b. affordability
    c. results that last
    d. support from licensed providers

4. then it says reviewing options, and shows the user:
    You’ve come to
    the right place
    Trusted weight loss medications
    Results you can see and feel
    Plans built for progress
    We’ve got range
    Wegovy® Pill
    From $149/mo†

    Semaglutide

    Get started
    View details
    Important safety info
    Zepbound® KwikPen®
    From $299/mo†

    Tirzepatide

    Get started
    View details
    Important safety info
    Foundayo™ Pill
    From $149/mo†

    Orforglipron

    Get started
    View details
    Important safety info
    Wegovy® Pen
    From $199/mo†

    Semaglutide

    Get started
    View details
    Important safety info
    Zepbound® Vial
    From $299/mo†

    Tirzepatide

    Get started
    View details
    Important safety info
    Ozempic® Pill
    From $149/mo†

    Semaglutide

    Get started
    View details
    Important safety info
    Ozempic®
    From $199/mo†

    Semaglutide

    Get started
    Important safety info
    †Price includes medication only, if prescribed. Aretide does not charge a separate platform membership or subscription fee — you pay for medication when prescribed. (Competitor reference: Hims requires a separate Weight Loss Membership billed on top of medication.)

    Ozempic® and Mounjaro® are FDA approved for type 2 diabetes and are available only to patients who meet clinical eligibility criteria, as determined by a licensed healthcare provider. See more

5. then the user selects a treatment option with the get started button again, (or view details which takes them to a screen explaining the details of the selected treatment option).

6. then it asks: What's your weight loss goal?
    a. lose 1-15 pounds
    b. losing 16-50 pounds
    c. losing 51+ lbs
    d. not sure i just need to lose weight

7. then it shows a screen stating 1 in 8 adults have taken glp-1.

8. then user selects next button

9. then it asks again if they already had a treatment in mind and gives 3 options to pick from:
    a. glp-1 pills
    b. glp-1 injections
    c. i'd like a provider recommendation

10. then it shows either pills/injections, or if provider recommendation, it shows a screen stating:
    We’re here to help. Let's keep going to see which one is the right fit for you.
    a. wegovy pill
    b. wegovy pen
    c. other glp-1 options

user clicks next

11. asks user to select the state they live in and to agree to the terms and conditions and telehealth consent and privacy policy.

12. then asks user the DOB

13. then asks: What would reaching your goal weight mean for you?
    a. having more energy
    b. feeling more confident
    c. improving overall health
    d. feeling better in my clothes
    e. feeling better in my body

then the next screen shows verified customers and how much weight they lost, then the user clicks next.

14. then it says: Ready to see if you're eligible?
First, you'll need an account with us.
    a. input email or already have an account? and gives options of sign in with google or apple.

15. then after signing in with a pwd, it asks height in feet/inches and weight

16. then it asks ethnicity with all the ethinicities options listed as buttons.

17. then it asks sex assigned at birth with only male or female options.

18. then it asks if they identify as a male or female (depending on the sex assigned at birth).

19. then it asks yes/no Is your current weight the most you have ever weighed?

20. How would you describe your typical daily activity level?
    a. 1-5 with 5 being 6-7 days per week of activity and 1 being no excercise during the week

21. Have you ever experienced any of these symptoms?
This helps your provider better understand your current health so they can recommend the best treatment for you.
    a. causing yourself to vomit in order to lose weight
    b. frequently eating very large amounts of food and feeling like you can't stop eating
    c. severely limiting the amount of food you eat due to an intense fear of gaining weight
    d. no, i have not experienced any of these

22. After clicking A on the above, it asks: Have you been diagnosed with any of the following conditions?
    a. anorexia
    b. Bulimia
    c. binge eating disorder
    d. no i have not been diagnosed with any of these conditions

23. After clicking A above: Have you been in remission from your anorexia or bulimia eating disorder for one year or more?
    a. no, i am currently being trated 
    b. no i have been in remission for less than one year
    c. yes i have been in remission for one year or more

- if on 22, c is clicked, same answer options as 23, but question changes to: Have you been in remission from your binge eating disorder for one year or more?

24. if option d is selected on q22, then: Have you purged or forced yourself to vomit in order to lose weight within the last 12 months?
    a. no
    b. yes






Chat GPT said these are the things i need to find out before/after signup:

Before signup (account creation)

These questions create the patient profile, verify identity and licensing requirements, and ensure you can legally treat the patient.

Legal name & contact information – full name, email and phone number so providers can contact the patient (basic intake questions include name and contact info).
Date of birth / age – to verify eligibility and guide care (demographic anchoring on age is part of Hims & Hers’ flow).
Gender identity and sex assigned at birth – used by 98point6 to match clinicians and tailor care.
Racial or ethnic identity (optional) – 98point6 asks this during registration; may be optional depending on regulations.
Home address and state of residence – helps verify licensure and calculate taxes; 98point6 requires address and state location.
Preferred pharmacy & primary care physician – patients enter pharmacy and PCP during 98point6 registration.
Insurance information – insurer name, member ID, and group number if billing through insurance (insurance details are part of typical intake forms).
Create login credentials – username and password or single‑sign‑on.
Consent to telehealth & HIPAA policies – acknowledge telehealth services and privacy terms (telehealth consent is a separate form).
Identity verification (photo ID) – Hims & Hers requires a photo of an ID or selfie to verify identity; similar steps are needed to meet telehealth prescribing regulations.
Communication preferences – opt‑in for push or SMS notifications for appointment reminders.
After signup – visit‑specific intake (before doctor review)

Once a patient has an account, the app should collect detailed health information related to the visit so the clinician can make informed decisions.

Reason for visit / goal selection – open‑ended question like “What brings you in?” or choose from common conditions (Hims & Hers uses goal selection as the first step).
Chief complaint & current symptoms – describe symptoms, onset, severity, triggers, and any photos (MDLIVE dermatology requires describing symptoms and uploading photos; 98point6 asks about chief complaint and symptoms with photo uploads).
Brief medical history – prior diagnoses, surgeries, chronic illnesses (Teladoc requires a brief medical history before the first visit and a Medical‑History Disclosure with basic medical history information; MDLIVE asks for a brief medical history).
Current medications & supplements – list prescription drugs, over‑the‑counter medicines, herbal supplements, and their dosages; providers review medications before each visit.
Medication allergies and other allergies – record allergies so clinicians avoid contraindicated treatments.
Family history or condition‑specific history – ask if there is a family history relevant to the complaint (Hims & Hers’ symptom probe uses branching questions about timeline and family history for hair loss and BMI/comorbidities for weight loss).
Contraindications and safety screenings – ask about pregnancy status, chronic conditions (e.g., heart disease, liver or kidney problems), and other contraindications; Hims & Hers includes medical safety screens for contraindications and medications.
Height, weight and lifestyle factors – capture height/weight (especially for weight‑loss or dosing); ask about smoking, alcohol consumption, exercise, and diet when relevant.
Social determinants of health (optional) – housing, transportation, and food security issues can affect treatment adherence; the Perspective AI article notes that conversational intake can capture social context.
Preferred pharmacy update – confirm the pharmacy for prescriptions (98point6 collects this earlier but it can be updated).
Upload supporting documents or photos – images of rashes, wounds, or lab results (required for dermatology in MDLIVE).
Consent for e‑prescribing and medication side‑effects – confirm the patient understands potential risks and that they agree to receive e‑prescriptions.
Payment method (if not collected at signup) – collect or confirm payment details before the visit.
Post‑visit follow‑up preferences – ask if the patient wants a follow‑up check or survey (follow‑up forms can collect symptom updates and patient satisfaction).

These questions reflect common practices among telehealth leaders such as Teladoc, MDLIVE, 98point6/Transcarent, and Hims & Hers. They help verify identity and eligibility upfront and gather the detailed clinical information a provider needs to review before offering care.



I am not saying necessarily to copy hims/hers at all but we will need to ask the same questions likely, just reworded. 
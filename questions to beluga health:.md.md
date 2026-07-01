questions to beluga health:

1. What is the visitType string for a GLP-1 weight-loss titration check-in? (docs show the endpoint path is /visit/{standard_creation_path} but don't give the visitType value)
2. What is the visitType string for an ED refill/titration check-in?
3. For other drug categories (anything they support beyond GLP-1 and ED) — what visitTypes exist and what formObj fields does each require?
4. What is the {refill_endpoint} path? (for Trigger Refill, same dose)
5. What is the {autorx_endpoint} path? (for the 6-month GLP-1 auto-titration protocol)
6. What is the {photo_endpoint} path?
7. Does pharmacyId come back in any webhook, or must we pass it in from our side? (if we must pass it, how do we get it?)
8. For "Stay the same" on a dose-change visit — do we call weightlossCheckin with titration: "Stay the same", or the Trigger Refill endpoint?
9. What auth method do they use on outbound webhooks? That determines BelugaWebhookPermission.


My questions:
1. does beluga require a valid id for weight loss drug prescriptions? 
2. when do i allow the patients to request a refill? how long after the prescription is written?
3. does beluga allow me to send a patient to their platform, and have the prescription approved, and then charge their payment method, and if fails, hold pharmacy fulfillment until valid payment method is confirmed, and they have been charged the amount for the prescription? 
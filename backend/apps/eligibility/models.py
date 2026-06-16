import uuid

from django.db import models

from apps.accounts.models import User


class EligibilityResponse(models.Model):
    TREATMENT_INTEREST_CHOICES = [
        ("insurance_brand", "Insurance brand"),
        ("cash_pay", "Cash pay"),
        ("not_sure", "Not sure"),
    ]
    INJECTION_PREF_CHOICES = [
        ("yes", "Yes"),
        ("pill_preferred", "Pill preferred"),
        ("not_sure", "Not sure"),
    ]
    BUDGET_CHOICES = [
        ("under_200", "Under $200"),
        ("200_300", "$200–$300"),
        ("300_500", "$300–$500"),
        ("500_plus", "$500+"),
        ("insurance", "Insurance"),
    ]
    SEX_CHOICES = [
        ("female", "Female"),
        ("male", "Male"),
        ("other", "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="eligibility")
    height_ft = models.CharField(max_length=8)
    height_in = models.CharField(max_length=8, blank=True, default="0")
    weight = models.CharField(max_length=8)
    bmi = models.FloatField(null=True, blank=True)
    goal_weight = models.CharField(max_length=8)
    biological_sex = models.CharField(max_length=16, choices=SEX_CHOICES)
    is_adult = models.BooleanField()
    lives_in_colorado = models.BooleanField()
    located_in_colorado = models.BooleanField()
    city = models.CharField(max_length=128)
    zip_code = models.CharField(max_length=16)
    treatment_interest = models.CharField(max_length=32, choices=TREATMENT_INTEREST_CHOICES)
    injection_preference = models.CharField(max_length=32, choices=INJECTION_PREF_CHOICES)
    budget = models.CharField(max_length=32, choices=BUDGET_CHOICES)
    safety_screen = models.JSONField(default=dict)
    safety_concern_flag = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "eligibility_responses"

    def __str__(self):
        return f"Eligibility for {self.user.email}"

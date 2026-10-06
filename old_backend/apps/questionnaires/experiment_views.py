from __future__ import annotations

import uuid

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsStaff
from apps.analytics.services import funnel_step_counts
from apps.questionnaires.models import Experiment, ExperimentVariant, Questionnaire
from apps.questionnaires.serializers import (
    ExperimentSerializer,
    ExperimentVariantWriteSerializer,
    ExperimentWriteSerializer,
)


class StaffExperimentListView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        experiments = Experiment.objects.prefetch_related(
            "variants__questionnaire_version", "questionnaire"
        ).order_by("-created_at")
        return Response(ExperimentSerializer(experiments, many=True).data)

    def post(self, request):
        serializer = ExperimentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        experiment = serializer.save(created_by=request.user)
        return Response(
            ExperimentSerializer(experiment).data,
            status=status.HTTP_201_CREATED,
        )


class StaffExperimentDetailView(APIView):
    permission_classes = [IsStaff]

    def get(self, request, experiment_id: uuid.UUID):
        experiment = get_object_or_404(
            Experiment.objects.prefetch_related("variants__questionnaire_version", "questionnaire"),
            id=experiment_id,
        )
        return Response(ExperimentSerializer(experiment).data)

    def patch(self, request, experiment_id: uuid.UUID):
        experiment = get_object_or_404(Experiment, id=experiment_id)
        serializer = ExperimentWriteSerializer(experiment, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        experiment = serializer.save()
        if experiment.status == Experiment.Status.RUNNING and not experiment.start_at:
            experiment.start_at = timezone.now()
            experiment.save(update_fields=["start_at", "updated_at"])
        return Response(ExperimentSerializer(experiment).data)


class StaffExperimentVariantListView(APIView):
    permission_classes = [IsStaff]

    def post(self, request, experiment_id: uuid.UUID):
        experiment = get_object_or_404(Experiment, id=experiment_id)
        serializer = ExperimentVariantWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        variant = ExperimentVariant.objects.create(experiment=experiment, **serializer.validated_data)
        return Response(
            {
                "id": str(variant.id),
                "variant_key": variant.variant_key,
                "questionnaire_version_id": str(variant.questionnaire_version_id),
                "weight_percent": variant.weight_percent,
            },
            status=status.HTTP_201_CREATED,
        )


class StaffExperimentResultsView(APIView):
    permission_classes = [IsStaff]

    def get(self, request, experiment_id: uuid.UUID):
        experiment = get_object_or_404(Experiment, id=experiment_id)
        results = []
        for variant in experiment.variants.all():
            steps = funnel_step_counts(
                questionnaire_slug=experiment.questionnaire.slug,
                experiment_id=str(experiment.id),
                variant_key=variant.variant_key,
            )
            results.append(
                {
                    "variant_key": variant.variant_key,
                    "version_label": variant.questionnaire_version.version_label,
                    "steps": steps,
                }
            )
        return Response({"experiment_id": str(experiment.id), "variants": results})

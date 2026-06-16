PHI_PATH_PREFIXES = (
    "/api/eligibility/",
    "/api/medical-intakes/",
    "/api/consent-records/",
    "/api/dashboard/",
    "/api/documents/",
    "/api/admin/patients/",
)


class AuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        return response

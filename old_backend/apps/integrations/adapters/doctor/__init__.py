from apps.integrations.adapters.doctor.mock import MockDoctorAdapter
from apps.integrations.adapters.doctor.openloop import OpenLoopDoctorAdapter


def get_doctor_adapter(partner: str | None = None):
    slug = (partner or "mock").lower()
    if slug == "mock":
        return MockDoctorAdapter()
    if slug == "openloop":
        return OpenLoopDoctorAdapter()
    return MockDoctorAdapter()

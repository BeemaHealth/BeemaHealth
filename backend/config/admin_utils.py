def all_model_fields(model, *, exclude=()):
    """Every concrete field and M2M relation — for detail/edit forms."""
    skip = set(exclude)
    names = [f.name for f in model._meta.fields if f.name not in skip]
    names.extend(f.name for f in model._meta.many_to_many if f.name not in skip)
    return tuple(names)


def all_list_display_fields(model, *, exclude=()):
    """Every scalar/FK field — list_display cannot include M2M or reverse FK."""
    skip = set(exclude)
    return tuple(f.name for f in model._meta.fields if f.name not in skip)


def auto_readonly_fields(model):
    readonly = []
    for field in model._meta.fields:
        if field.name == "id" or getattr(field, "auto_now", False) or getattr(field, "auto_now_add", False):
            readonly.append(field.name)
    return tuple(readonly)

"""Static validation of a questionnaire definition graph (used by publish, the loader and tests)."""
from __future__ import annotations

import hashlib
import json
from typing import Any

from .engine import (
    AUTO_TYPES,
    NODE_TYPES,
    TERMINAL_TYPES,
    Definition,
    condition_refs,
    node_edges,
)

_CHOICE_TYPES = {"radio", "multi_select"}


class DefinitionError(ValueError):
    """The definition is structurally invalid. ``errors`` lists every problem found."""

    def __init__(self, errors: list[str]) -> None:
        super().__init__("; ".join(errors))
        self.errors = errors


def definition_hash(definition: Definition) -> str:
    """Stable SHA-256 of the canonical JSON form."""
    canonical = json.dumps(definition, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def find_errors(definition: Any) -> list[str]:
    """Every structural problem: unknown types, dangling edges, unreachable nodes, cycles, dead ends."""
    if not isinstance(definition, dict) or not isinstance(definition.get("nodes"), dict):
        return ["Definition needs a nodes object."]
    nodes: dict[str, dict[str, Any]] = definition["nodes"]
    start = definition.get("start")
    errors: list[str] = []
    if start not in nodes:
        return ["Start node does not exist."]
    for node_id, node in nodes.items():
        if not isinstance(node, dict) or node.get("id") != node_id:
            errors.append(f"Node {node_id}: id must match its key.")
            continue
        errors.extend(_node_errors(node_id, node, nodes))
    if errors:
        return errors
    errors.extend(_graph_errors(nodes, start))
    return errors


def _node_errors(node_id: str, node: dict[str, Any], nodes: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    kind = node.get("type")
    if kind not in NODE_TYPES:
        return [f"Node {node_id}: unknown type."]
    for edge in node_edges(node):
        if edge not in nodes:
            errors.append(f"Node {node_id}: edge to missing node {edge}.")
    for route in node.get("routes", []):
        for ref in condition_refs(route.get("when")):
            if ref not in nodes:
                errors.append(f"Node {node_id}: condition reads missing node {ref}.")
    if kind in TERMINAL_TYPES and node_edges(node):
        errors.append(f"Node {node_id}: terminal nodes cannot have edges.")
    if kind == "no_proceed" and not node.get("reason"):
        errors.append(f"Node {node_id}: no_proceed needs a reason code.")
    if kind not in TERMINAL_TYPES and not node_edges(node):
        errors.append(f"Node {node_id}: no outgoing edge.")
    if kind in _CHOICE_TYPES:
        keys = [o.get("key") for o in node.get("options", [])]
        if not keys or len(set(keys)) != len(keys) or not all(keys):
            errors.append(f"Node {node_id}: options must be non empty with unique keys.")
    if kind == "bmi" and node.get("min_bmi") is not None and node.get("below_min_goto") not in nodes:
        errors.append(f"Node {node_id}: bmi needs below_min_goto.")
    if kind == "zip_router" and node.get("unavailable_goto") not in nodes:
        errors.append(f"Node {node_id}: zip_router needs unavailable_goto.")
    if kind == "checkout":
        errors.extend(_checkout_errors(node_id, node))
    return errors


def _checkout_errors(node_id: str, node: dict[str, Any]) -> list[str]:
    errors = []
    for key in ("drug_ref", "additive_refs", "phase_ref", "variants"):
        if not node.get(key):
            errors.append(f"Node {node_id}: checkout needs {key}.")
    for key, variant in node.get("variants", {}).items():
        if len(key.split(".")) != 3 or not variant.get("plan_slugs"):
            errors.append(f"Node {node_id}: variant {key} needs drug.additive.phase and plan_slugs.")
    return errors


def _graph_errors(nodes: dict[str, Any], start: str) -> list[str]:
    errors: list[str] = []
    reachable: set[str] = set()
    stack = [start]
    while stack:
        current = stack.pop()
        if current not in reachable:
            reachable.add(current)
            stack.extend(node_edges(nodes[current]))
    for node_id in sorted(set(nodes) - reachable):
        errors.append(f"Node {node_id}: unreachable.")
    if nodes[start]["type"] in AUTO_TYPES:
        errors.append("Definition cannot start on an auto node.")
    if _has_cycle(nodes, start):
        errors.append("Definition contains a cycle.")
    # Every reachable node must be able to reach a terminal node (no dead ends).
    can_finish = {n for n in reachable if nodes[n]["type"] in TERMINAL_TYPES}
    changed = True
    while changed:
        changed = False
        for node_id in reachable - can_finish:
            if any(edge in can_finish for edge in node_edges(nodes[node_id])):
                can_finish.add(node_id)
                changed = True
    for node_id in sorted(reachable - can_finish):
        errors.append(f"Node {node_id}: cannot reach an end node.")
    if not any(nodes[n]["type"] == "thank_you" for n in reachable):
        errors.append("No thank_you node is reachable.")
    return errors


def _has_cycle(nodes: dict[str, Any], start: str) -> bool:
    white, grey, black = 0, 1, 2
    color = {n: white for n in nodes}
    stack: list[tuple[str, int]] = [(start, 0)]
    while stack:
        node_id, idx = stack.pop()
        if idx == 0:
            color[node_id] = grey
        edges = node_edges(nodes[node_id])
        if idx < len(edges):
            stack.append((node_id, idx + 1))
            edge = edges[idx]
            if color[edge] == grey:
                return True
            if color[edge] == white:
                stack.append((edge, 0))
        else:
            color[node_id] = black
    return False


def validate_definition(definition: Any) -> None:
    """Raise ``DefinitionError`` listing every structural problem."""
    errors = find_errors(definition)
    if errors:
        raise DefinitionError(errors)

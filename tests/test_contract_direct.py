"""GenLayer official direct-mode tests for deterministic escrow rules."""
import json
import time
from pathlib import Path

import pytest
from gltest.direct import VMContext, create_address, deploy_contract

CONTRACT = Path(__file__).parents[1] / "contracts" / "TurnMasterEscrow.py"
SDK_RUNTIME = "v0.2.12"
CRITERION = "Evidence proves a valid delivered result."
CLIENT = create_address("turnmaster-client")
WORKER = create_address("turnmaster-worker")
OUTSIDER = create_address("turnmaster-outsider")
FEE = "0x3333333333333333333333333333333333333333"
REWARD = 100_000


@pytest.fixture
def escrow():
    vm = VMContext(_chain_id=4221)
    vm.sender = CLIENT
    with vm.activate():
        job = deploy_contract(
            CONTRACT,
            vm,
            "Deliver tested feature",
            "Build and test the requested feature with clear evidence.",
            "A passing test report and a source repository link.",
            json.dumps([CRITERION]),
            "Public URL",
            int(time.time()) + 3600,
            REWARD,
            150,
            FEE,
            sdk_version=SDK_RUNTIME,
        )
        yield vm, job


def fund(vm, job, value=REWARD):
    vm.sender = CLIENT
    vm.value = value
    job.fund()
    vm.value = 0
    # The direct-mode VM does not automatically move a payable value into the
    # ghost-contract balance; mirror the documented contract balance after the
    # successful payable write.
    vm.deal(vm._contract_address, value)


def claim_and_deliver(vm, job):
    vm.sender = WORKER
    job.claim()
    job.submit_delivery(
        "Completed the work and included the verifiable report.",
        '["https://example.org/evidence"]',
    )


def test_create_and_exact_client_funding(escrow):
    vm, job = escrow
    record = json.loads(job.get_job())
    assert record["status"] == "open"
    assert record["funded"] is False
    vm.sender = WORKER
    vm.value = REWARD
    with pytest.raises(Exception):
        job.fund()
    assert json.loads(job.get_job())["funded"] is False
    vm.sender = CLIENT
    vm.value = REWARD - 1
    with pytest.raises(Exception):
        job.fund()
    assert json.loads(job.get_job())["funded"] is False
    fund(vm, job)
    assert json.loads(job.get_job())["status"] == "funded"


@pytest.mark.parametrize(
    "criteria,reward",
    [
        ("[]", REWARD),
        (json.dumps(["too short"]), REWARD),
        (json.dumps([CRITERION]), 0),
        (json.dumps([CRITERION]), -1),
    ],
)
def test_constructor_rejects_empty_or_vague_criteria_and_zero_reward(criteria, reward):
    vm = VMContext(_chain_id=4221)
    vm.sender = CLIENT
    with vm.activate(), pytest.raises(Exception):
        deploy_contract(
            CONTRACT,
            vm,
            "Deliver tested feature",
            "Build and test the requested feature with clear evidence.",
            "A passing test report and a source repository link.",
            criteria,
            "Public URL",
            int(time.time()) + 3600,
            reward,
            150,
            FEE,
            sdk_version=SDK_RUNTIME,
        )


def test_role_checks_and_delivery_lifecycle(escrow):
    vm, job = escrow
    fund(vm, job)
    vm.sender = CLIENT
    with pytest.raises(Exception):
        job.claim()
    vm.sender = OUTSIDER
    job.claim()
    vm.sender = WORKER
    with pytest.raises(Exception):
        job.claim()
    with pytest.raises(Exception):
        job.submit_delivery("Delivered work with evidence.", "[]")
    vm.sender = OUTSIDER
    job.submit_delivery("Delivered work with evidence.", '["https://example.org/evidence"]')
    vm.sender = OUTSIDER
    with pytest.raises(Exception):
        job.accept_delivery()
    assert json.loads(job.get_job())["status"] == "delivered"


def test_revision_re_delivery_and_no_second_payout(escrow):
    vm, job = escrow
    fund(vm, job)
    claim_and_deliver(vm, job)
    vm.sender = CLIENT
    job.request_revision("The second required link is missing from the delivery.")
    assert json.loads(job.get_job())["status"] == "revision_requested"
    vm.sender = WORKER
    job.submit_delivery("Updated delivery includes the missing link.", '["https://example.org/evidence"]')
    vm.sender = CLIENT
    job.accept_delivery()
    assert json.loads(job.get_job())["status"] == "resolved"
    assert json.loads(job.get_job())["payout_queued"] is True
    with pytest.raises(Exception):
        job.accept_delivery()


def test_dispute_with_unavailable_evidence_is_undetermined(escrow):
    vm, job = escrow
    fund(vm, job)
    claim_and_deliver(vm, job)
    vm.sender = CLIENT
    job.open_dispute("The evidence does not prove the required deliverable.")
    vm.mock_web("https://example.org/evidence", {"status": 503, "body": "unavailable"})
    vm.sender = OUTSIDER
    with pytest.raises(Exception):
        job.resolve_dispute()
    vm.sender = CLIENT
    job.resolve_dispute()
    record = json.loads(job.get_job())
    assert record["status"] == "undetermined"
    assert record["payout_queued"] is False
    with pytest.raises(Exception):
        job.resolve_dispute()


def test_dispute_with_retrievable_evidence_uses_genlayer_equivalence(escrow):
    vm, job = escrow
    fund(vm, job)
    claim_and_deliver(vm, job)
    vm.sender = CLIENT
    job.open_dispute("The submitted evidence needs a neutral criteria review.")
    vm.sender = CLIENT
    job.submit_dispute_evidence('["https://example.org/evidence"]')
    vm.sender = WORKER
    job.submit_dispute_evidence('["https://example.org/evidence"]')
    vm.mock_web("https://example.org/evidence", {"status": 200, "body": "The public report verifies the requested feature and its passing test."})
    vm.mock_llm(
        "Evaluate the submitted work",
        json.dumps({"outcome": "release_to_worker", "reasoning": "The public evidence supports the required output.", "criteria": [{"criterion": CRITERION, "result": "pass", "reasoning": "The report verifies the work."}]}),
    )
    job.resolve_dispute()
    record = json.loads(job.get_job())
    assert record["status"] == "resolved", record["decision"]
    assert record["payout_queued"] is True
    report = json.loads(record["decision"])
    assert report["criteria"][0]["result"] == "pass"
    assert report["evidence"]["client"] == ["https://example.org/evidence"]
    assert len(report["evidence"]["worker"]) == 2


def test_client_can_refund_undelivered_job_after_deadline(escrow):
    vm, job = escrow
    fund(vm, job)
    vm.warp("2030-01-01T00:00:00Z")
    vm.sender = CLIENT
    job.refund_after_deadline()
    record = json.loads(job.get_job())
    assert record["status"] == "resolved"
    assert record["payout_queued"] is True
    with pytest.raises(Exception):
        job.refund_after_deadline()


def test_funding_and_delivery_are_rejected_after_deadline(escrow):
    vm, job = escrow
    vm.warp("2030-01-01T00:00:00Z")
    vm.sender = CLIENT
    vm.value = REWARD
    with pytest.raises(Exception):
        job.fund()


def test_delivery_is_rejected_after_deadline(escrow):
    vm, job = escrow
    fund(vm, job)
    vm.sender = WORKER
    job.claim()
    vm.warp("2030-01-01T00:00:00Z")
    with pytest.raises(Exception):
        job.submit_delivery("Completed the work and included the verifiable report.", '["https://example.org/evidence"]')


def test_only_client_can_cancel_an_unfunded_job(escrow):
    vm, job = escrow
    vm.sender = OUTSIDER
    with pytest.raises(Exception):
        job.cancel_unfunded()
    vm.sender = CLIENT
    job.cancel_unfunded()
    assert json.loads(job.get_job())["status"] == "cancelled"

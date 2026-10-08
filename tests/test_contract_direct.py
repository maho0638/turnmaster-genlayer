"""GenLayer official direct-mode tests for deterministic escrow rules."""
import json
import time
from datetime import datetime, timezone
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
    with pytest.raises(Exception):
        job.resolve_dispute()
    # An unrepresented worker gets a full 48-hour evidence response window.
    deadline = json.loads(job.get_job())["dispute"]["evidence_deadline"]
    vm.warp(datetime.fromtimestamp(deadline + 1, timezone.utc).isoformat())
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
    vm.mock_llm("Evaluate the submitted work", json.dumps(["pass"]))
    job.resolve_dispute()
    record = json.loads(job.get_job())
    assert record["status"] == "resolved", record["decision"]
    assert record["payout_queued"] is True
    report = json.loads(record["decision"])
    assert report["criteria"][0]["result"] == "pass"
    assert report["evidence"]["client"] == ["https://example.org/evidence"]
    assert len(report["evidence"]["worker"]) == 2


@pytest.mark.parametrize("evaluation", [[], ["maybe"], ["unverifiable"], {"result": "pass"}])
def test_malformed_or_unverifiable_genlayer_reports_never_settle(escrow, evaluation):
    vm, job = escrow
    fund(vm, job)
    claim_and_deliver(vm, job)
    vm.sender = CLIENT
    job.open_dispute("The evidence needs a neutral criteria review.")
    vm.mock_web("https://example.org/evidence", {"status": 200, "body": "A public test report with verifiable results."})
    vm.mock_web("https://example.org/client", {"status": 200, "body": "Client objections are noted."})
    vm.mock_web("https://example.org/worker", {"status": 200, "body": "Worker provides supporting tests."})
    vm.mock_llm("Evaluate the submitted work", json.dumps(evaluation))
    vm.sender = CLIENT
    job.submit_dispute_evidence('["https://example.org/client"]')
    vm.sender = WORKER
    job.submit_dispute_evidence('["https://example.org/worker"]')
    vm.sender = CLIENT
    job.resolve_dispute()
    record = json.loads(job.get_job())
    report = json.loads(record["decision"])
    assert record["status"] == "undetermined"
    assert report["outcome"] == "undetermined"
    assert record["payout_queued"] is False


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


def _advance(vm, timestamp):
    vm.warp(datetime.fromtimestamp(int(timestamp), timezone.utc).isoformat())


def test_prevents_early_one_sided_dispute_resolution(escrow):
    vm, job = escrow
    fund(vm, job)
    claim_and_deliver(vm, job)
    vm.sender = WORKER
    job.open_dispute("Please review the public delivery evidence fairly.")
    opened = json.loads(job.get_job())
    assert opened["dispute"]["evidence_deadline"] > 0
    assert opened["dispute"]["recovery_deadline"] > opened["dispute"]["evidence_deadline"]

    job.submit_dispute_evidence('["https://example.org/worker"]')
    with pytest.raises(Exception, match="Both responses or evidence deadline"):
        job.resolve_dispute()
    vm.sender = CLIENT
    with pytest.raises(Exception, match="Both responses or evidence deadline"):
        job.resolve_dispute()
    # Neither a client nor a worker can cut short the other's response window.
    vm.sender = WORKER
    with pytest.raises(Exception, match="already responded"):
        job.submit_dispute_evidence('["https://example.org/other"]')


def test_evidence_deadline_opens_resolution_without_missing_party(escrow):
    vm, job = escrow
    fund(vm, job)
    claim_and_deliver(vm, job)
    vm.sender = WORKER
    job.open_dispute("The delivery meets the frozen acceptance criteria.")
    job.submit_dispute_evidence('["https://example.org/worker"]')
    _advance(vm, json.loads(job.get_job())["dispute"]["evidence_deadline"] + 1)
    vm.sender = CLIENT
    with pytest.raises(Exception, match="Evidence deadline passed"):
        job.submit_dispute_evidence('["https://example.org/late"]')
    vm.mock_web("https://example.org/evidence", {"status": 200, "body": "The evidence is conclusive."})
    vm.mock_web("https://example.org/worker", {"status": 200, "body": "Worker proof."})
    vm.mock_llm("Evaluate the submitted work", json.dumps(["unverifiable"]))
    vm.sender = WORKER
    job.resolve_dispute()
    assert json.loads(job.get_job())["status"] == "undetermined"


def test_mixed_fail_and_unverifiable_verdict_does_not_refund_or_release():
    vm = VMContext(_chain_id=4221)
    vm.sender = CLIENT
    with vm.activate():
        job = deploy_contract(
            CONTRACT, vm, "Deliver tested feature",
            "Build and test the requested feature with clear evidence.",
            "A passing test report and a source repository link.",
            json.dumps([CRITERION, "Provide another independent and public proof link."]),
            "Public URL", int(time.time()) + 3600, REWARD, 150, FEE,
            sdk_version=SDK_RUNTIME,
        )
        fund(vm, job)
        claim_and_deliver(vm, job)
        vm.sender = CLIENT
        job.open_dispute("Both public criteria require a neutral review.")
        job.submit_dispute_evidence('["https://example.org/client"]')
        vm.sender = WORKER
        job.submit_dispute_evidence('["https://example.org/worker"]')
        vm.mock_web("https://example.org/evidence", {"status": 200, "body": "Evidence here."})
        vm.mock_web("https://example.org/client", {"status": 200, "body": "Evidence here."})
        vm.mock_web("https://example.org/worker", {"status": 200, "body": "Evidence here."})
        vm.mock_llm("Evaluate the submitted work", json.dumps(["fail", "unverifiable"]))
        job.resolve_dispute()
        record = json.loads(job.get_job())
        assert record["status"] == "undetermined"
        assert json.loads(record["decision"])["outcome"] == "undetermined"


def test_dispute_retry_is_bounded_and_preserves_absolute_timeout(escrow):
    vm, job = escrow
    fund(vm, job)
    claim_and_deliver(vm, job)
    vm.sender = CLIENT
    job.open_dispute("The frozen criteria cannot be fully verified yet.")
    job.submit_dispute_evidence('["https://example.org/client"]')
    vm.sender = WORKER
    job.submit_dispute_evidence('["https://example.org/worker"]')
    vm.mock_web("https://example.org/evidence", {"status": 200, "body": "Insufficient details."})
    vm.mock_web("https://example.org/client", {"status": 200, "body": "Insufficient details."})
    vm.mock_web("https://example.org/worker", {"status": 200, "body": "Insufficient details."})
    vm.mock_llm("Evaluate the submitted work", json.dumps(["unverifiable"]))
    job.resolve_dispute()
    first = json.loads(job.get_job())
    assert first["status"] == "undetermined"
    original_recovery = first["dispute"]["recovery_deadline"]

    vm.sender = OUTSIDER
    with pytest.raises(Exception):
        job.retry_dispute("I am not a legitimate party to the job.")
    vm.sender = WORKER
    job.retry_dispute("I have stronger evidence for a second review.")
    second = json.loads(job.get_job())
    assert second["status"] == "disputed"
    assert second["dispute"]["retry_count"] == 1
    assert second["dispute"]["round"] == 2
    assert second["dispute"]["recovery_deadline"] == original_recovery
    with pytest.raises(Exception, match="Both responses or evidence deadline"):
        job.resolve_dispute()

    _advance(vm, second["dispute"]["evidence_deadline"] + 1)
    job.resolve_dispute()
    assert json.loads(job.get_job())["status"] == "undetermined"
    with pytest.raises(Exception, match="Retry unavailable"):
        job.retry_dispute("Third review attempts are strictly forbidden.")


@pytest.mark.parametrize("from_state", ["disputed", "undetermined"])
def test_recovery_of_entire_escrow_from_inconclusive_dispute(escrow, from_state):
    vm, job = escrow
    fund(vm, job)
    claim_and_deliver(vm, job)
    vm.sender = WORKER
    job.open_dispute("The evidence cannot yet settle the disputed milestone.")
    vm.sender = CLIENT
    if from_state == "undetermined":
        job.submit_dispute_evidence('["https://example.org/client"]')
        vm.sender = WORKER
        job.submit_dispute_evidence('["https://example.org/worker"]')
        vm.mock_web("https://example.org/evidence", {"status": 200, "body": "Cannot verify."})
        vm.mock_web("https://example.org/client", {"status": 200, "body": "Cannot verify."})
        vm.mock_web("https://example.org/worker", {"status": 200, "body": "Cannot verify."})
        vm.mock_llm("Evaluate the submitted work", json.dumps(["unverifiable"]))
        job.resolve_dispute()
    state = json.loads(job.get_job())
    recovery = state["dispute"]["recovery_deadline"]
    with pytest.raises(Exception, match="Recovery deadline active"):
        job.refund_after_dispute_timeout()
    _advance(vm, recovery + 1)
    # Even the worker can force the client refund; cannot be held hostage.
    vm.sender = WORKER
    job.refund_after_dispute_timeout()
    result = json.loads(job.get_job())
    assert result["status"] == "resolved"
    assert result["payout_queued"] is True
    assert json.loads(result["decision"])["outcome"] == "dispute_timeout_refund"
    assert int(result["reward_wei"]) == REWARD
    with pytest.raises(Exception):
        job.refund_after_dispute_timeout()


def test_expired_revision_request_refunds_client(escrow):
    vm, job = escrow
    fund(vm, job)
    claim_and_deliver(vm, job)
    vm.sender = CLIENT
    job.request_revision("Worker must provide a second link to the test report.")
    _advance(vm, json.loads(job.get_job())["deadline"] + 1)
    vm.sender = WORKER
    with pytest.raises(Exception):
        job.submit_delivery("Updated work is ready, see the public report.", '["https://example.org/evidence"]')
    vm.sender = CLIENT
    job.refund_after_deadline()
    state = json.loads(job.get_job())
    assert state["status"] == "resolved"
    assert json.loads(state["decision"])["outcome"] == "deadline_missed"


def test_http_error_cannot_be_overridden_by_a_positive_model_verdict(escrow):
    vm, job = escrow
    fund(vm, job)
    claim_and_deliver(vm, job)
    vm.sender = CLIENT
    job.open_dispute("The public delivery source cannot currently be opened.")
    job.submit_dispute_evidence('["https://example.org/client"]')
    vm.sender = WORKER
    job.submit_dispute_evidence('["https://example.org/worker"]')
    vm.mock_web("https://example.org/evidence", {"status": 503, "body": "A forged positive report."})
    vm.mock_web("https://example.org/client", {"status": 200, "body": "Client note."})
    vm.mock_web("https://example.org/worker", {"status": 200, "body": "Worker note."})
    vm.mock_llm("Evaluate the submitted work", json.dumps(["pass"]))
    job.resolve_dispute()
    state = json.loads(job.get_job())
    assert state["status"] == "undetermined"
    assert state["payout_queued"] is False

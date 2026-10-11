"""Direct-mode checks for the shared TurnMaster address directory."""
import json
from pathlib import Path

import pytest
from gltest.direct import VMContext, create_address, deploy_contract

DIRECTORY = Path(__file__).parents[1] / "contracts" / "TurnMasterDirectory.py"
SDK_RUNTIME = "v0.2.12"


@pytest.fixture
def directory():
    vm = VMContext(_chain_id=4221)
    addresses = [create_address(f"turnmaster-seed-{index}") for index in range(3)]
    encoded_addresses = ["0x" + address.hex() for address in addresses]
    with vm.activate():
        instance = deploy_contract(
            DIRECTORY,
            vm,
            json.dumps(encoded_addresses),
            sdk_version=SDK_RUNTIME,
        )
        yield vm, instance, addresses, encoded_addresses


def test_seeded_addresses_are_publicly_readable_and_newest_first(directory):
    _, instance, _, encoded = directory
    assert instance.get_job_count() == 3
    assert [address.lower() for address in json.loads(instance.get_jobs(0, 2))] == [address.lower() for address in reversed(encoded[-2:])]
    assert [address.lower() for address in json.loads(instance.get_jobs(2, 2))] == [encoded[0].lower()]
    assert json.loads(instance.get_jobs(3, 2)) == []


def test_registration_is_idempotent_for_an_existing_entry(directory):
    vm, instance, addresses, _ = directory
    vm.sender = addresses[0]
    instance.register_job()
    assert instance.get_job_count() == 3


def test_directory_rejects_callers_that_do_not_expose_a_job(directory):
    vm, instance, _, _ = directory
    vm.sender = create_address("turnmaster-directory-outsider")
    with pytest.raises(Exception, match="readable TurnMaster job"):
        instance.register_job()
    assert instance.get_job_count() == 3


def valid_job_record():
    return {
        "client": "0x1111111111111111111111111111111111111111",
        "worker": "0x0000000000000000000000000000000000000000",
        "title": "Valid directory job",
        "description": "A readable description.",
        "delivery_definition": "A public report link.",
        "acceptance_criteria": ["The public report has the requested verified result."],
        "proof_type": "Public URL",
        "deadline": 1_800_000_000,
        "reward_wei": "1000000000000000000",
        "commission_bps": 0,
        "status": "open",
        "funded": False,
        "revision_count": 0,
        "decision": "{}",
        "payout_queued": False,
        "escrow_wei": "0",
        "delivery": {"description": "", "evidence_urls": []},
        "dispute": {
            "reason": "", "evidence_deadline": 0, "recovery_deadline": 0,
            "client_responded": False, "worker_responded": False,
            "retry_count": 0, "round": 0,
            "client_evidence_urls": [], "worker_evidence_urls": [],
        },
    }


@pytest.mark.parametrize(
    "mutate",
    [
        lambda job: job.update(acceptance_criteria=None),
        lambda job: job.update(client="bad-address"),
        lambda job: job.update(reward_wei="not-a-number"),
        lambda job: job.update(deadline=True),
        lambda job: job.update(status="spoofed"),
        lambda job: job.update(delivery={"description": "", "evidence_urls": None}),
        lambda job: job.update(dispute={"reason": "", "client_evidence_urls": None}),
    ],
)
def test_directory_rejects_malformed_job_records(directory, mutate, monkeypatch):
    vm, instance, _, _ = directory
    import sys

    payload = valid_job_record()
    mutate(payload)

    class ReadOnlyContract:
        def view(self):
            return self

        def get_job(self):
            return json.dumps(payload)

    with vm.activate():
        directory_module = sys.modules["_contract_TurnMasterDirectory"]
        monkeypatch.setattr(directory_module.gl, "get_contract_at", lambda _address: ReadOnlyContract())
        vm.sender = create_address("malformed-directory-caller")
        with pytest.raises(Exception, match="readable TurnMaster job"):
            instance.register_job()
    assert instance.get_job_count() == 3


def test_directory_accepts_a_complete_job_record(directory, monkeypatch):
    vm, instance, _, _ = directory
    import sys

    class ReadOnlyContract:
        def view(self):
            return self

        def get_job(self):
            return json.dumps(valid_job_record())

    with vm.activate():
        directory_module = sys.modules["_contract_TurnMasterDirectory"]
        monkeypatch.setattr(directory_module.gl, "get_contract_at", lambda _address: ReadOnlyContract())
        fake_address = create_address("valid-directory-caller")
        vm.sender = fake_address
        instance.register_job()
    assert instance.get_job_count() == 4
    assert json.loads(instance.get_jobs(0, 1))[0].lower() == str(fake_address).lower()


@pytest.mark.parametrize("offset,limit", [(0, 0), (0, 101)])
def test_directory_rejects_invalid_page_sizes(directory, offset, limit):
    _, instance, _, _ = directory
    with pytest.raises(Exception, match="Page size"):
        instance.get_jobs(offset, limit)

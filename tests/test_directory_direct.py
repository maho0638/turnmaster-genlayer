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


@pytest.mark.parametrize("offset,limit", [(0, 0), (0, 101)])
def test_directory_rejects_invalid_page_sizes(directory, offset, limit):
    _, instance, _, _ = directory
    with pytest.raises(Exception, match="Page size"):
        instance.get_jobs(offset, limit)

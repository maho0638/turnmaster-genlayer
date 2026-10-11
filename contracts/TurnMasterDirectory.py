# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
import json
from genlayer import *

PAGE_MAX = 100
JOB_STATUSES = (
    "open", "funded", "claimed", "delivered", "revision_requested",
    "disputed", "undetermined", "resolved", "cancelled",
)


def _is_uint(value):
    return isinstance(value, int) and not isinstance(value, bool) and value >= 0


def _is_text(value):
    return isinstance(value, str)


def _is_string_list(value):
    return isinstance(value, list) and all(_is_text(item) for item in value)


def _is_job_record(job):
    if not isinstance(job, dict):
        return False
    required_text = (
        "client", "worker", "title", "description", "delivery_definition",
        "proof_type", "reward_wei", "status", "decision",
    )
    if any(not _is_text(job.get(key)) for key in required_text):
        return False
    if len(job["title"].strip()) < 4 or job["status"] not in JOB_STATUSES:
        return False
    try:
        Address(job["client"])
        Address(job["worker"])
    except Exception:
        return False
    criteria = job.get("acceptance_criteria")
    if not _is_string_list(criteria) or len(criteria) == 0:
        return False
    if not job["reward_wei"].isdigit() or not _is_uint(job.get("deadline")):
        return False
    commission = job.get("commission_bps")
    if not _is_uint(commission) or commission > 10000:
        return False
    if not isinstance(job.get("funded"), bool) or not isinstance(job.get("payout_queued"), bool):
        return False
    if not _is_uint(job.get("revision_count")):
        return False
    if "escrow_wei" in job and (not _is_text(job["escrow_wei"]) or not job["escrow_wei"].isdigit()):
        return False
    if "delivery" in job:
        delivery = job["delivery"]
        if not isinstance(delivery, dict) or not _is_text(delivery.get("description")):
            return False
        if not _is_string_list(delivery.get("evidence_urls")):
            return False
    if "dispute" in job and job["dispute"] is not None:
        dispute = job["dispute"]
        if not isinstance(dispute, dict) or not _is_text(dispute.get("reason")):
            return False
        if not _is_uint(dispute.get("evidence_deadline")) or not _is_uint(dispute.get("recovery_deadline")):
            return False
        if not isinstance(dispute.get("client_responded"), bool) or not isinstance(dispute.get("worker_responded"), bool):
            return False
        if not _is_uint(dispute.get("retry_count")) or not _is_uint(dispute.get("round")):
            return False
        if not _is_string_list(dispute.get("client_evidence_urls")) or not _is_string_list(dispute.get("worker_evidence_urls")):
            return False
    return True


class TurnMasterDirectory(gl.Contract):
    jobs: DynArray[Address]
    seen: TreeMap[Address, bool]

    def __init__(self, seed_addresses_json: str = "[]"):
        try:
            seed_addresses = json.loads(seed_addresses_json)
        except Exception:
            raise gl.vm.UserError("Invalid seed address list")
        if not isinstance(seed_addresses, list):
            raise gl.vm.UserError("Invalid seed address list")
        for value in seed_addresses:
            try:
                address = Address(value)
            except Exception:
                raise gl.vm.UserError("Invalid seed address")
            if address != Address("0x0000000000000000000000000000000000000000") and not self.seen.get(address, False):
                self.jobs.append(address)
                self.seen[address] = True

    @gl.public.write
    def register_job(self):
        address = gl.message.sender_address
        if self.seen.get(address, False):
            return
        try:
            raw = gl.get_contract_at(address).view().get_job()
            job = json.loads(raw)
        except Exception:
            raise gl.vm.UserError("Only a readable TurnMaster job can register")
        if not _is_job_record(job):
            raise gl.vm.UserError("Only a readable TurnMaster job can register")
        self.jobs.append(address)
        self.seen[address] = True

    @gl.public.view
    def get_job_count(self) -> u32:
        return u32(len(self.jobs))

    @gl.public.view
    def get_jobs(self, offset: u32, limit: u32) -> str:
        if limit == u32(0) or limit > u32(PAGE_MAX):
            raise gl.vm.UserError("Page size must be between 1 and 100")
        total = len(self.jobs)
        start = max(0, total - int(offset) - int(limit))
        end = max(0, total - int(offset))
        return json.dumps([self.jobs[index].as_hex for index in range(end - 1, start - 1, -1)])

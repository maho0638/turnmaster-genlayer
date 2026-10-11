# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
import json
from genlayer import *

PAGE_MAX = 100


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
        required = ("client", "title", "description", "delivery_definition", "acceptance_criteria")
        if not isinstance(job, dict) or any(key not in job for key in required):
            raise gl.vm.UserError("Only a readable TurnMaster job can register")
        try:
            Address(job["client"])
        except Exception:
            raise gl.vm.UserError("TurnMaster job returned an invalid client address")
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

"""Hook Schemathesis untuk rute /api/v1 web Pawonee (PWN-WEB-TEST-SCHEMATHESIS).

- Pembatas laju web 30 permintaan/menit per kunci (token Authorization, lalu X-Device-Key, lalu IP).
  Satu token statis membuat hampir semua kasus dijawab 429, jadi tiap permintaan membawa Bearer acak.
  Web tidak memeriksa JWT (hanya meneruskannya ke hulu), jadi token acak cukup.
- `PUT /profil/{idKeluarga}`: idKeluarga di badan harus sama dengan di path; kesamaan dua bidang tak dapat
  ditulis di JSON Schema, jadi disamakan di sini (aturannya diuji di src/lib/server/api/api.test.ts).
"""

import uuid

import schemathesis


@schemathesis.auth(refresh_interval=None)
class AuthAcak:
    def get(self, case, ctx):
        return uuid.uuid4().hex

    def set(self, case, data, ctx):
        case.headers = case.headers or {}
        case.headers["Authorization"] = f"Bearer {data}"


@schemathesis.hook
def before_call(context, case, kwargs):
    if case.operation.label == "PUT /profil/{idKeluarga}" and isinstance(case.body, dict):
        id_path = (case.path_parameters or {}).get("idKeluarga")
        if isinstance(id_path, str) and "idKeluarga" in case.body:
            case.body["idKeluarga"] = id_path

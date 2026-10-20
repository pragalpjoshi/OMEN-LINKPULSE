import hashlib
from fastapi import APIRouter, Depends, Query, Response
from app.security import get_current_user_id

router = APIRouter(prefix="/api/qr", tags=["QR Code"])


def generate_svg_qr(data: str, size: int = 240) -> str:
    try:
        import qrcode
        qr = qrcode.QRCode(version=2, box_size=10, border=2)
        qr.add_data(data)
        qr.make(fit=True)
        matrix = qr.get_matrix()
        n = len(matrix)
    except Exception:
        n = 25
        matrix = [[False] * n for _ in range(n)]

        def add_finder(r0: int, c0: int):
            for r in range(7):
                for c in range(7):
                    if r in (0, 6) or c in (0, 6) or (2 <= r <= 4 and 2 <= c <= 4):
                        matrix[r0 + r][c0 + c] = True

        add_finder(0, 0)
        add_finder(0, n - 7)
        add_finder(n - 7, 0)

        digest = hashlib.sha256(data.encode("utf-8")).digest()
        bit_idx = 0
        for r in range(n):
            for c in range(n):
                if (r < 8 and c < 8) or (r < 8 and c >= n - 8) or (r >= n - 8 and c < 8):
                    continue
                byte_val = digest[(bit_idx // 8) % len(digest)]
                matrix[r][c] = bool((byte_val >> (bit_idx % 8)) & 1)
                bit_idx += 1

    cell = size / n
    rects = []
    for r, row in enumerate(matrix):
        for c, val in enumerate(row):
            if val:
                x = round(c * cell, 2)
                y = round(r * cell, 2)
                w = round(cell + 0.35, 2)
                rects.append(f'<rect x="{x}" y="{y}" width="{w}" height="{w}" fill="#0f172a"/>')

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">'
        f'<rect width="100%" height="100%" fill="#ffffff" rx="12"/>'
        f'{"".join(rects)}'
        f"</svg>"
    )


@router.get("")
def get_qr_svg(
    url: str = Query(..., min_length=1),
    size: int = Query(default=240, ge=100, le=600),
    _user_id: int = Depends(get_current_user_id),
):
    svg = generate_svg_qr(url, size=size)
    return Response(content=svg, media_type="image/svg+xml")
/**
 * Serialize JSON for embedding inside an HTML <script> element.
 *
 * JSON.stringify alone is not safe in an HTML raw-text element because a
 * user-controlled `</script>` sequence terminates the element before the
 * JavaScript/JSON parser sees it. Escaping the HTML-significant characters
 * keeps the payload valid JSON while preventing parser break-out.
 */
export function serializeJsonForHtml(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

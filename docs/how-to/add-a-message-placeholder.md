# Add a message placeholder

Templates can only use allow-listed values ([ADR 0006](../adr/0006-liquid-for-workspace-editable-templates.md)). Example: add `machine.description`.

1. **Add the real value** in `MessageRenderer.variables_for` in [`message_renderer.rb`](../../api/app/models/message_renderer.rb):

   ```ruby
   "machine" => { "name" => booking.machine.name, "description" => booking.machine.description },
   ```

2. **Add a sample value** to `MessageRenderer::SAMPLE`, so saving and previewing a template that uses it validates:

   ```ruby
   "machine" => { "name" => "Laser cutter", "description" => "60 × 40 cm bed." },
   ```

   Without this, `strict_variables` rejects the placeholder when a template is saved.
3. **List it in the editor:** add `'machine.description'` to `VARIABLES` in [`MessagesPage.tsx`](../../web/apps/member/src/manage/MessagesPage.tsx).
4. **Test it:** extend "renders allow-listed variables" in [`messages_spec.rb`](../../api/spec/messages/messages_spec.rb).
5. **Keep it safe:** only add plain strings that the recipient may see. Never expose emails of other people, IDs or anything from another workspace.
6. **Document it:** update the allow-list in ADR 0006 and the F-09 entry in [features.md](../reference/features.md), add a CHANGELOG line, and run `make verify`.

Messages already in the outbox are not affected: they were rendered when they were recorded.

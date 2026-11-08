---
status: accepted
date: 2026-10-17
decision-makers: [project maintainer]
---

# Liquid for workspace-editable templates

## Context and Problem Statement

Managers want to reword booking messages. The template language runs on every save, on every preview keystroke and at send time, and its authors are not trusted with code execution. Which template language should Booking Kiosk use?

## Decision Drivers

* Template authors must not be able to run Ruby or reach data outside an allow-list.
* Rendering must stay cheap, because it runs on every preview keystroke.
* Mistakes should be reported clearly when saving, not discovered at send time.

## Considered Options

* Liquid with strict modes and only branching tags
* ERB
* A homemade `{{placeholder}}` substitution

## Decision Outcome

Chosen option: "Liquid", because it was designed for untrusted authors and has strict modes and resource limits.

* `error_mode: :strict`, `strict_variables` and `strict_filters`.
* Only branching tags (`if`, `unless`, `case`, `comment`, `raw`). Loops, assignment, captures and includes are not registered; range literals such as `(1..999999999)` are refused before parsing; the render-score, assign-score and output-length limits are set. Without these, an empty loop over a billion-element range would pin a CPU and produce no output at all.
* Input is bounded before any work: subjects up to 160 characters and bodies up to 5,000, for saves and previews alike. The range check is a single linear pass; an earlier backtracking regular expression took time quadratic in the number of unclosed tags. `Regexp.timeout` (one second) backs up every regular expression in the process.
* The available values are an explicit allow-list (`member.name`, `machine.name`, `workspace.name`, `booking.date`, `booking.starts_at`, `booking.ends_at`).
* A template is validated against sample values when saved, and previewed live against the default for its own message kind.

### Consequences

* Good, because customisation is safe and errors are readable.
* Neutral, because messages are a few sentences long, so losing loops costs nothing.
* Bad, because a saved template could still fail at send time in theory; the default wording is then used, the message is flagged `used_fallback_template`, and a warning is logged.

### Confirmation

[`api/spec/messages/messages_spec.rb`](../../api/spec/messages/messages_spec.rb) checks strict rendering, fallback with flagged problems, only branching tags, ranges refused quickly (loop and filter bombs), and the range check staying under half a second on 100,000 characters of unclosed tags; [`workspace_api_spec.rb`](../../api/spec/requests/workspace_api_spec.rb) checks over-long previews are refused before rendering.

## Pros and Cons of the Options

### Liquid

* Good, because there is no code execution and it has built-in limits.
* Bad, because it is one more gem (MIT).

### ERB

* Good, because it is built in.
* Bad, because a template can run arbitrary Ruby.

### Homemade substitution

* Good, because it is tiny at first.
* Bad, because it grows into an untested language as soon as anyone wants a conditional.

## More Information

How to add a value to the allow-list: [how-to/add-a-message-placeholder.md](../how-to/add-a-message-placeholder.md).

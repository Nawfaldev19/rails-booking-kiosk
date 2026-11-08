# A backstop for any regular expression that meets hostile input: a match that
# runs longer than this raises Regexp::TimeoutError instead of tying up a Puma
# thread. Template checks avoid backtracking patterns in the first place
# (MessageRenderer.range_in_markup?).
Regexp.timeout = 1.0

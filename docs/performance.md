# Performance Notes

These are illustrative timings from checked-in real-server artifacts, not a formal benchmark suite.

They exist to make runtime expectations legible for contributors and adopters.

## Example Check Timings

| Target | Tools | Prompts | Resources | Semantics |
| --- | ---: | ---: | ---: | ---: |
| filesystem-server | 8.13 ms | unsupported | unsupported | 0.00 ms |
| everything-server | 11.04 ms | 1.19 ms | 1.81 ms | 0.01 ms |
| ref-tools-server | 1.26 ms | 0.25 ms | unsupported | 0.00 ms |

## How To Interpret This

- these numbers mostly reflect capability request/response time after process startup
- process startup cost still matters in real-world usage
- different servers advertise very different capability shapes, so timings are not directly comparable across all targets
- the current goal is confidence and evidence, not micro-optimized throughput

If benchmarking becomes important later, it should be added as a separate, explicit effort rather than mixed into normal validation output.

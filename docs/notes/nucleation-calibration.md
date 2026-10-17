# Nucleation calibration (metallurgic model)

The metallurgic model compares clusters against the critical size n* of classical nucleation theory (CNT), with the line tension from Onsager's exact result for the square-lattice Ising model. CNT treats clusters as circles and is least reliable when n* is small, so on this lattice the estimate is only a guide.

`scripts/calibrate-nucleation.ts` runs the lattice gas (288 × 180 sites, Q = 6, grain-boundary bond 0.5) at several settings. "Largest dissolved" is the biggest largest-cluster size later followed by a fall below half that size, that is, a cluster that size was seen to break up. It is a noisy measure, since the largest cluster can be a different cluster from one moment to the next.

Results (Oct 17, 2026):

```
T     dmu   n*(CNT)  seed  largest-dissolved  ratio  growth@sweep  half-solid@sweep
0.36  0.12     21.9     3                 24    1.1           760              1635
0.36  0.12     21.9    11                 18    0.8           655              2090
0.36  0.12     21.9    23                 17    0.8           275              1700
0.36  0.13     18.6     3                 31    1.7           510              1710
0.36  0.13     18.6    11                 33    1.8           900              1975
0.36  0.13     18.6    23                 38    2.0           440              1275
0.38  0.12     18.5     3                 17    0.9           285              1350
0.38  0.12     18.5    11                  0    0.0           250              1055
0.38  0.12     18.5    23                 62    3.4           655              1520
0.38  0.13     15.7     3                  0    0.0           245               990
0.38  0.13     15.7    11                  0    0.0           180               930
0.38  0.13     15.7    23                 29    1.8           215               880
0.40  0.12     15.2     3                  0    0.0           200               800
0.40  0.12     15.2    11                  0    0.0           135               895
0.40  0.12     15.2    23                  0    0.0           160               895
```

Clusters up to about three times the CNT estimate were seen to dissolve. The model therefore counts a cluster as past the threshold, and beyond the reach of warding off, only at three times the estimate (`THRESHOLD_FACTOR` in `src/models/metallurgic.ts`). This is a conservative choice made from the measurement, not a result of the theory.

The defaults (T = 0.38, Δμ = 0.12) were chosen so that growth begins after a few hundred sweeps, a few seconds at three sweeps per frame, from one or a few nuclei.

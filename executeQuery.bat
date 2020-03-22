FOR /L %%i IN (%3,1,%4) DO START /wait node index.js %1 %2 %3 %%i %4 %5

exit
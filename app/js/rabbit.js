/*
 * Copyright (c) 2012, Intel Corporation.
 *
 * This program is licensed under the terms and conditions of the 
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */

window.Rabbit = window.Rabbit || {};

Rabbit.EASY = 1;
Rabbit.MEDIUM = 2;
Rabbit.HARD = 3;

Rabbit.Grid = function (level, setup, state)
{
    // public

    this.setParent = function (gridElem)
    {
        _gridElem = gridElem;
        while (_gridElem.hasChildNodes()) {
            _gridElem.removeChild(_gridElem.firstChild);
        }
        _gridElem.appendChild(_fragment);
    }

    this.saveAll = function ()
    {
        localStorage.rrr_gridSetup = JSON.stringify(_setups);
        this.saveState();
    }

    this.saveState = function ()
    {
        if (_dirty) {
            localStorage.rrr_gridState = JSON.stringify(_states);
            _dirty = false;
        }
    }

    this.elem = function (x, y)
    {
        return _elems[x][y];
    }

    this.state = function (x, y)
    {
        return _states[x][y];
    }

    this.setup = function (x, y)
    {
        return _setups.data[x][y];
    }

    this.randomX = function ()
    {
        return Math.floor(Math.random() * _numX);
    }

    this.randomY = function ()
    {
        return Math.floor(Math.random() * _numY);
    }

    this.selectCell = function (x, y)
    {
        var state = _states[x][y];
        if (state.hidden) {
            if (useSounds) {
                clickSound.play();
            }
            if (! _setups.carrotsPlaced) {
                objectSetup.bind(this)(x, y);
            }
            var setup = _setups.data[x][y];
            if (setup.count >= 9) {
                doLose(x, y);
            }
            else {
                floodFill(x, y);
                showQueue(x, y);
            }
        }
    }

    this.__defineGetter__("dirty", function() { return _dirty; });
    this.__defineGetter__("carrots", function() { return _carrotsToPlace; });

    // private

    var _level = level;
    var _dirty = true;
    var _numX = 10;
    var _numY = 12;
    var _gridElem;
    var _fragment = document.createDocumentFragment();
    var _setups = setup || createSetup(_numX, _numY, level);
    var _states = state || createState(_numX, _numY);
    var _elems = createStructure(_numX, _numY, _fragment);
    var _carrotsToPlace = 12;

    function doLose (x, y)
    {
        var elem = _elems[x][y];
        queueCell(x, y);
        showQueue();
        themeSound.pause();
        if (useSounds) {
            loseSound.play();
        }
        gameScreen.classList.add("lose");
        setPause(true);
        isInGame(false);
        rabbitEyesElem.classList.add("mad");
    }

    function floodFill (startX, startY)
    {
        var thisCell = _setups.data[startX][startY];
        if (thisCell.count > 0) {
            queueCell(startX, startY);
            /*
	    if (!cellsToShow) {
	        win(startX, startY);
	    }
	    else {
	        doShow(startX, startY);
	    }
            */
    	    return;
        }

        var stack = [];
        stack.push(thisCell);

        var x, y1;
        while (stack.length) {
            thisCell = stack.pop();
            x = thisCell.x;
            y1 = thisCell.y;
            
            while (y1 > 0) {
                thisCell = _setups.data[x][y1];
                if (!_states[x][y1-1].hidden || 
                    (_setups.data[x][y1-1].count > 0) ||
                    thisCell.walls[0]) {
                    break;
                }
                --y1;
            }

            var spanLeft  = false;
            var spanRight = false;

            while (true) {
                changeNeighbors(x, y1, function(neighbor) {
                    if (neighbor.count > 0) {
                        queueCell(neighbor.x, neighbor.y);
                    }
                });

                if (x > 0) {
                    var leftCell = _setups.data[x-1][y1];
	            var leftNeedsShowing = (_states[x-1][y1].hidden && 
                                            (leftCell.count === 0) && 
                                            (thisCell.walls[3] === false));

                    if (leftNeedsShowing && (!spanLeft || leftCell.walls[0])) {
                        stack.push(leftCell);
                        spanLeft = true;
                    }
                    else if (!leftNeedsShowing && spanLeft) {
                        spanLeft = false;
                    }
                }
                    
	        if (x+1 < _numX) {
                    var rightCell = _setups.data[x+1][y1];
	            var rightNeedsShowing = (_states[x+1][y1].hidden && 
                                             (rightCell.count === 0) &&
                                             (thisCell.walls[1] === false));
                    if (rightNeedsShowing && (!spanRight || rightCell.walls[0])) {
                        stack.push(rightCell);
                        spanRight = true;
                    }
                    else if (spanRight && !rightNeedsShowing) {
                        spanRight = false;
                    }
                }

                queueCell(x, y1);
                if (thisCell.walls[2]) {
                    break;
                }
                ++y1;
                if (y1 == _numY) {
                    break;
                }
                thisCell = _setups.data[x][y1];
                if (!_states[x][y1].hidden) {
                    break;
                }
                if (thisCell.count > 0) {
                    queueCell(x, y1);
                    break;
                }
            }
        }
    }

    function queueAll ()
    {
        for(var yy=0; yy < _numY; ++yy) {
            for(var xx=0; xx < _numX; ++xx) {
                queueCell(xx, yy);
            }
        }
    }

    function queueCell (x, y)
    {
        var state = _states[x][y];
        if (state.hidden) {
            state.hidden = false;
            toShowList.push({"x":x, "y":y});
        }
    }

    function showQueue (x, y)
    {
        toShowList.sort(function(a,b) {
	    var aDist = Math.pow(Math.abs(a.x-x),2) + Math.pow(Math.abs(a.y-y),2);
	    var bDist = Math.pow(Math.abs(b.x-x),2) + Math.pow(Math.abs(b.y-y),2);
	    if (aDist == bDist) return 0;
	    else if (aDist < bDist) return 1;
	    else return -1;
        });
        showQueueOnce();
    }

    function showQueueOnce ()
    {
        if (toShowList.length) {
	    var coord = toShowList.pop();
	    showCell(coord.x, coord.y);
            if (carrotCount == _setups.carrotsPlaced) {
                doWin(coord.x, coord.y);
            }
            setTimeout(showQueueOnce, showTimerDelay);
        }
    }

    function doWin (x, y)
    {
        gameScreen.classList.add("win");
        setPause(true);
        isInGame(false);
        foxEyesElem.classList.add("mad");
        refreshBestScore(gameLevel, time);
        if (useSounds) {
            winSound.play();
            themeSound.pause();
        }
    }

    function showCell (x, y)
    {
        _elems[x][y].classList.remove("hidden");
        var state = _states[x][y];
        var setup = _setups.data[x][y];
        if (setup.carrot) {
            setCarrotCount(carrotCount + 1);
        }
        _dirty = true;
    }

    function createSetup (numX, numY, level)
    {
        var x, y;
        var setup;
        var setups = {carrotsPlaced: 0, data: []};
        for (x = 0; x < numX; ++x) {
            setups.data[x] = [];
            for (y = 0; y < numY; ++y) {
                setups.data[x][y] = {
                    "x": x,
                    "y": y,
                    count: 0,
                    carrot: false,
                    walls: [false, false, false, false]
                }
            }
        }

        // Place walls

        if (false) {
            for(x = 0; x < numX; ++x) {
                if (x == 3) continue;
                setups.data[x][4].walls[2] = true;
                setups.data[x][5].walls[0] = true;
            }
            for(x = 0; x < numX; ++x) {
                setups.data[x][9].walls[2] = true;
                setups.data[x][10].walls[0] = true;
            }
            for(y = 0; y < numY; ++y) {
                setups.data[6][y].walls[1] = true;
                setups.data[7][y].walls[3] = true;
            }
            //for(y = 0; y < numY; ++y) {
            //    setups.data[5][y].walls[1] = true;
            //    setups.data[6][y].walls[3] = true;
            //}
        }

        return setups;
    }

    function changeNeighbors (x, y, fn)
    {
        var data = _setups.data;
        var setup = data[x][y];
        if (y > 0) {
            if (x > 0) {
                otherSetup = data[x-1][y-1];
                if (!(setup.walls[0] && setup.walls[3]) &&
                    !(otherSetup.walls[1] && otherSetup.walls[2]) &&
                    !(setup.walls[0] && otherSetup.walls[2]) &&
                    !(setup.walls[3] && otherSetup.walls[1])) {
                    fn(otherSetup);
                }
            }
            if (setup.walls[0] === false) {
                fn(data[x][y-1]);
            }
            if (x+1 < _numX) {
                otherSetup = data[x+1][y-1];
                if (!(setup.walls[0] && setup.walls[1]) &&
                    !(otherSetup.walls[2] && otherSetup.walls[3]) &&
                    !(setup.walls[0] && otherSetup.walls[2]) &&
                    !(setup.walls[1] && otherSetup.walls[3])) {
                    fn(otherSetup);
                }
            }
        }
        if (x > 0) {
            if (setup.walls[3] === false) {
                fn(data[x-1][y]);
            }
        }
        if (x+1 < _numX) {
            if (setup.walls[1] === false) {
                fn(data[x+1][y]);
            }
        }
        if (y+1 < _numY) {
            if (x > 0) {
                otherSetup = data[x-1][y+1];
                if (!(setup.walls[2] && setup.walls[3]) &&
                    !(otherSetup.walls[0] && otherSetup.walls[1]) &&
                    !(setup.walls[2] && otherSetup.walls[0]) &&
                    !(setup.walls[3] && otherSetup.walls[1])) {
                    fn(otherSetup);
                }
            }
            if (setup.walls[2] === false) {
                fn(data[x][y+1]);
            }
            if (x+1 < _numX) {
                otherSetup = data[x+1][y+1];
                if (!(setup.walls[1] && setup.walls[2]) &&
                    !(otherSetup.walls[0] && otherSetup.walls[3]) &&
                    !(setup.walls[2] && otherSetup.walls[0]) &&
                    !(setup.walls[1] && otherSetup.walls[3])) {
                    fn(otherSetup);
                }
            }
        }
    }

    function objectSetup (startX, startY)
    {
        // Place foxes

        var data = _setups.data;
        var foxesToPlace = _level * 5 + 5;
        var x, y;
        while (foxesToPlace) {
            x = this.randomX();
            y = this.randomY();
            if ((x === startX) && (y === startY)) {
                continue;
            }
            var thisCell = _setups.data[x][y];
            if (thisCell.count < 9) {
                thisCell.count = 9;
                changeNeighbors(x, y, function(neighbor) {
                    ++(neighbor.count);
                });
                --foxesToPlace;
            }
        }

        // Place carrots

        _setups.carrotsPlaced = 0;
        while (_setups.carrotsPlaced < _carrotsToPlace) {
            x = this.randomX();
            y = this.randomY();
            if ((x != startX) || (y != startY)) {
                var setup = _setups.data[x][y];
                if ((setup.count < 9) && (!setup.carrot)) {
                    setup.carrot = true;
                    ++_setups.carrotsPlaced;
                }
            }
        }

        objectStructure(_elems);
        this.saveAll();
    }

    function objectStructure (elems)
    {
        var x, y;
        var elem;
        for (x = 0; x < _numX; ++x) {
            for (y = 0; y < _numY; ++y) {
                var elem = elems[x][y];
                var cl = elem.classList;

                var setup = _setups.data[x][y];
                if (setup.carrot) {
                    cl.add("hasCarrot");
                }
                if (setup.count) {
                    if (setup.count >= 9) {
                        cl.add("hasFox");
                    }
                    else {
                        elem.innerText = setup.count;
                    }
                }
            }
        }
    }

    function createState (numX, numY)
    {
        var x, y;
        var state;
        var states = [];
        for (x = 0; x < numX; ++x) {
            states[x] = [];
            for (y = 0; y < numY; ++y) {
                states[x][y] = {
                    hidden: true,
                    flagged: false
                }
            }
        }
        return states;
    }

    function createStructure (numX, numY, fragment)
    {
        var height = 38;
        var width = 39;
        var x, y;
        var elem;
        var elems = [];
        for (x = 0; x < numX; ++x) {
            elems[x] = [];
            for (y = 0; y < numY; ++y) {
                elem = document.createElement("div");
                elem.style.top = y*height + "px";
                elem.style.left = x*width + "px";
                elem.dataset.cellX = x;
                elem.dataset.cellY = y;

                var cl = elem.classList;
                cl.add("cell");

                var state = _states[x][y];
                if (state.hidden) {
                    cl.add("hidden");
                }

                var setup = _setups.data[x][y];
                for (var i = 0; i < 4; ++i) {
                    if (setup.walls[i]) {
                        cl.add("hasWall"+i)
                    }
                }

                elems[x][y] = elem;
                fragment.appendChild(elem);
            }
        }

        if (_setups.carrotsPlaced) {
            objectStructure(elems);
        }
        return elems;
    }

    // constructor

}

function addButtonEffects (elem, callback, sound)
{
    var cl = elem.classList;
    elem.addEventListener("mousedown", function () {
        cl.add("pressed");
    }, false);
    elem.addEventListener("mouseout", function () {
        cl.remove("pressed");
    }, false);
    elem.addEventListener("click", function () {
        cl.remove("pressed");
        if (useSounds) {
            if (sound && sound.play) {
                sound.play();
            }
            else {
                clickSound.play();
            }
        }
        callback(event);
    }, false);   
}


// TODO: is there some localization function to use for this?
function getTimeString (time)
{
    var secs = time%60;
    var secStr = (secs < 10 ? "0" : "") + secs;
    var minStr = "" + Math.floor(time/60);

    var timeStr = getMessage("timeFormat", [minStr, secStr]);
    return timeStr;
}

var timeCountElem;
function setTime (time)
{
    timeCountElem = timeCountElem || document.getElementById("time_count");
    localStorage.rrr_time = time;
    timeCountElem.innerText = getTimeString(time);
}

function incrementTime ()
{
    if (gameInProgress) {
        setTime(++time);
    }
    else {
        clearTimeout(gameTimerId);
        time = 0;
    }
}

function refreshBestScore (level, score)
{
    if (!bestScores) {
        bestScores = [null, null, null];
    }

    if (score === undefined) {
        if (bestScores[level-1] === null) {
            bestScoreElem.innerText = "";
        }
        else {
            bestScoreElem.innerText = getTimeString(bestScores[level-1]);
        }
    }
    else if ((bestScores[level-1] === null) || (score < bestScores[level-1])) {
        bestScores[level-1] = score;
        localStorage.rrr_bestScores = JSON.stringify(bestScores);
        bestScoreElem.innerText = getTimeString(time);
    }
}

var carrotCountElem;
function setCarrotCount (num) 
{
    carrotCount = num;
    carrotCountElem = carrotCountElem || document.getElementById("carrot_count");
    carrotCountElem.innerText = Rabbit.grid.carrots - num;
    localStorage.rrr_carrotCount = num;
}

function isInGame (b)
{
    gameInProgress = b;
    localStorage.rrr_gameInProgress = b;
}

function mouseCell (event)
{
    if (!gameInProgress) return;

    var target = event.target;
    var cl = target.classList;
    if (!cl.contains("cell") || !cl.contains("hidden")) {
        return;
    }

    var x = +target.dataset.cellX;
    var y = +target.dataset.cellY;

    var type = event.type;
    if (type == "mousedown") {
        cl.add("pressed");
    }
    else if (type == "mouseout") {
        cl.remove("pressed");
    }
    else if (type == "click") {
        setPause(false);
        cl.remove("pressed");
        Rabbit.grid.selectCell(x, y);
        Rabbit.grid.saveState();
    }
}

function animateCharacters () 
{
    animateFoxTail();
    animateFoxHead();
    animateFoxEyes();
    animateFoxBlink();

    animateRabbitArm();
    animateRabbitBlink();
    animateRabbitWhiskers();
}

function animateFoxTail()
{
    var delay = Math.random() * 5000 + 5000;
    foxTailElem = foxTailElem || document.querySelector("#fox .tail");
    setTimeout(function() {
        if (!gameInProgress && !isDialogOpen) {
            foxTailElem.classList.add("wag");
            setTimeout(function() {foxTailElem.classList.remove("wag");}, 750);
        }
        animateFoxTail();
    }, delay);
}

function animateFoxHead()
{
    var delay = Math.random() * 5000 + 5000;
    foxHeadElem = foxHeadElem || document.querySelector("#fox .head");
    setTimeout(function() {
        if (!isDialogOpen) {
            foxHeadElem.classList.toggle("nod");
        }
        animateFoxHead();
    }, delay);
}

function animateFoxEyes()
{
    var delay = Math.random() * 3000 + 3000;
    foxEyesElem = foxEyesElem || document.querySelector("#fox .eyes");
    setTimeout(function() {
        if (!isDialogOpen) {
            foxEyesElem.classList.toggle("left");
        }
        animateFoxEyes();
    }, delay);
}

function animateFoxBlink()
{
    var delay = Math.random() * 2000 + 2000;
    foxEyesElem = foxEyesElem || document.querySelector("#fox .eyes");
    setTimeout(function() {
        if (!isDialogOpen) {
            var cl = foxEyesElem.classList;
            cl.add("closed");
            setTimeout(function() {cl.remove("closed");}, 100);
        }
        animateFoxBlink();
    }, delay);
}

function animateRabbitArm () 
{
    var delay = Math.random() * 7000 + 7000;
    rabbitArmElem = rabbitArmElem || document.querySelector("#rabbit .arm");
    rabbitHeadElem = rabbitHeadElem || document.querySelector("#rabbit .head");
    setTimeout(function() {
        if (!isDialogOpen) {
            var clArm = rabbitArmElem.classList;
            var clHead = rabbitHeadElem.classList;
            setTimeout(function() {
                if (useSounds) {
                    rabbitSound.play()
                };
            }, 0);
            setTimeout(function() {clArm.add("raise");},     0);
            setTimeout(function() {clHead.add("chomp");},    750);
            setTimeout(function() {clHead.remove("chomp");}, 750+250);
            setTimeout(function() {clHead.add("chomp");},    750+250+250); 
            setTimeout(function() {clHead.remove("chomp");}, 750+250+250+250);
            setTimeout(function() {clArm.remove("raise");},  750+250+250+250+250);
       }
        animateRabbitArm();
    }, delay);
}

function animateRabbitBlink ()
{
    var delay = Math.random() * 2000 + 2000;
    rabbitEyesElem = rabbitEyesElem || document.querySelector("#rabbit .eyes");
    setTimeout(function() {
        if (!isDialogOpen) {
            var cl = rabbitEyesElem.classList;
            cl.add("closed");
            setTimeout(function() {cl.remove("closed");}, 100);
        }
        animateRabbitBlink();
    }, delay);
}

function animateRabbitWhiskers ()
{
    var delay = Math.random() * 4000 + 4000;
    rabbitWhiskersElem = rabbitWhiskersElem || document.querySelector("#rabbit .whiskers");
    setTimeout(function() {
        if (!isDialogOpen) {
            var cl = rabbitWhiskersElem.classList;
            setTimeout(function() {cl.add("twitch1");},    0);
            setTimeout(function() {cl.add("twitch2");},    150);
            setTimeout(function() {cl.remove("twitch2");}, 150+150);
            setTimeout(function() {cl.remove("twitch1");}, 150+150+150); 
       }
        animateRabbitWhiskers();
    }, delay);
}

function clearBestTime (level)
{
    bestScores[level-1] = null;
    localStorage.rrr_bestScores = JSON.stringify(bestScores);
    if (gameInProgress && (level === gameLevel)) {
            refreshBestScore(gameLevel);
    }
}

function startGame (level)
{
    gameScreen.classList.remove("win");
    gameScreen.classList.remove("lose");

    if (level) {
        gameLevel = level;
        localStorage.rrr_gameLevel = level;
    }

    foxElem = foxElem || document.getElementById("fox");
    foxElem.classList.add("game");
    rabbitElem = rabbitElem || document.getElementById("rabbit");
    rabbitElem.classList.add("game");

    if (!gameInProgress) {
        Rabbit.grid = new Rabbit.Grid(gameLevel);
        Rabbit.grid.saveAll();
    }
    isInGame(true);

    gridElem = gridElem || document.getElementById("grid");
    Rabbit.grid.setParent(gridElem);
    gridElem.addEventListener("mousedown", mouseCell, false);
    gridElem.addEventListener("mouseout", mouseCell, false);
    gridElem.addEventListener("click", mouseCell, false);

    titleScreen.classList.remove("shown");
    gameScreen.classList.add("shown");

    refreshBestScore(gameLevel);
    setTime(time);
    setCarrotCount(carrotCount);
}

function quitGame (event)
{
    closeDialogCallback(event);
    initGameState();
    titleScreen.classList.add("shown");
    gameScreen.classList.remove("shown");
    foxElem.classList.remove("game");
    rabbitElem.classList.remove("game");
    foxEyesElem.classList.remove("mad");
    rabbitEyesElem.classList.remove("mad");

    if (useSounds && themeSound.paused) {
        themeSound.play();
        themeSound.reset();
    }
}

var hintEnabled = true;
function enableHints (b) 
{
    if (b == hintEnabled) return;
    hintEnabled = b;

    if (hintEnabled) {
        hintButtonElem.classList.remove("pressed");
    }
    else {
        hintButtonElem.classList.add("pressed");
    }
}

var doingHint = false;
function doHint (event)
{
    if (!gameInProgress) return;
    if (!hintEnabled) return;

    enableHints(false);
    setPause(false);
    var x, y;
    var state, setup, elem;
    do {
        x = Rabbit.grid.randomX();
        y = Rabbit.grid.randomY();
        state = Rabbit.grid.state(x, y);
        setup = Rabbit.grid.setup(x, y);
    } while (!state.hidden || (setup.count >= 9));

    elem = Rabbit.grid.elem(x, y);
    elem.classList.add("hint");
    setTimeout(function () {
        Rabbit.grid.selectCell(x, y);
        Rabbit.grid.saveState();
        elem.classList.remove("hint");
        enableHints(true);
    }, 3000);
    for (var i = 0; i < 3; ++i) {
        setTimeout(function () {
            if (useSounds) {
                hintSound.play();
            }
        }, i*1000+150);
    }
}

var gameTimerId;
function setPause (b)
{
    if (b === isPaused) {
        return;
    }

    if (isPaused) {
        playButtonElem.classList.add("playing");
        gameTimerId = setInterval(incrementTime, 1000);
    }
    else {
        playButtonElem.classList.remove("playing");
        clearTimeout(gameTimerId);
    }
    isPaused = b;
}

function togglePause ()
{
    if (!gameInProgress) return;
    setPause(!isPaused);
}

function initGameState ()
{
    isInGame(false);
    score     = 0;
    time      = 0;
    carrotCount  = 0;
    gameLevel = gameLevel;
    Rabbit.grid = undefined;
    isPaused = true;
    toShowList = [];
}

function restoreGameState ()
{
    delete Rabbit.grid;

    if (localStorage && localStorage.rrr_bestScores) {
        try {
            bestScores = JSON.parse(localStorage.rrr_bestScores)
        }
        catch (e) {
            // NOP
        }
    }

    if (localStorage && localStorage.rrr_gameInProgress && 
        (localStorage.rrr_gameInProgress == "true")) {
        try {
	    gameInProgress = true;
	    score      = +localStorage.rrr_score      || 0;
	    time       = +localStorage.rrr_time       || 0;
	    carrotCount = +localStorage.rrr_carrotCount   || 0;
	    gameLevel   = +localStorage.rrr_gameLevel  || EASY;
            var gridSetup = JSON.parse(localStorage.rrr_gridSetup);
            var gridState = JSON.parse(localStorage.rrr_gridState);
            Rabbit.grid = new Rabbit.Grid(gameLevel, gridSetup, gridState);
        }
        catch (e) {
            // NOP, in case the json doesn't parse well
        }
    }

    if (undefined === Rabbit.grid) {
	initGameState();
    }
}

function restoreSettings ()
{
    try {
        useSounds = JSON.parse(localStorage.rrr_useSounds);
        useHints  = JSON.parse(localStorage.rrr_useHints);
    }
    catch (e) {
        useSounds = true;
        useHints  = true;
        localStorage.rrr_useSounds = JSON.stringify(useSounds);
        localStorage.rrr_useHints  = JSON.stringify(useHints);
    }
}


function openDialogCallback (dialogElem, event) {
    var cl = dialogElem.classList;
    cl.add("shown");
    isDialogOpen = true;
}


function closeDialogCallback (event) {
    var parent = event.target.offsetParent;
    while (parent)
    {
        var cl = parent.classList;
        if (cl.contains("dialog")) {
            parent.addEventListener("webkitTransitionEnd", function (event) {
                cl.remove("fadeOut");
                parent.removeEventListener("webkitTransitionEnd");
                isDialogOpen = false;
            }, false);
            cl.add("fadeOut");
            cl.remove("shown");
            break;
        }
        parent = parent.offsetParent;
    }
}

function updateSettingsStyle (value, elem)
{
    if (value) {
        elem.classList.add("active");
        elem.innerText = getMessage("settings_on");
    }
    else {
        elem.classList.remove("active");
        elem.innerText = getMessage("settings_off");
    }
}

function toggleSounds () {
    useSounds = !useSounds;
    themeSound = themeSound || (new gamesound("audio.theme", true));
    if (useSounds) {
        themeSound.play();
    }
    else {
        themeSound.pause();
    }
    updateSettingsStyle(useSounds, settingsSoundsElem);
    localStorage.rrr_useSounds = JSON.stringify(useSounds);
}

///////////////////////////////////////////////////////////////////////////////

// DOM elements

var titleScreen, gameScreen;
var helpElem, helpButtonElem;
var settingsElem, settingsButtonElem, settings2ButtonElem;
var settingsSoundsElem, settingsHintsElem;
var quitConfirmElem, quitConfirmYesElem, quitConfirmNoElem;
var easyElem, mediumElem, hardElem;
var hintButtonElem, newGameButtonElem, playButtonElem, bestScoreElem;
var gridElem;
var foxElem, foxTailElem, foxHeadElem, foxEyesElem; 
var rabbitElem, rabbitHeadElem, rabbitEyesElem, rabbitWhiskersElem, rabbitArmElem;

var themeSound, clickSound, hintSound, crunchSound, loseSound, winSound;

// Saved game state

var gameInProgress, score, time, carrotCount, gameLevel;
var bestScores;

// Game Settings 

var useSounds, useHints;

// Derived game state

var isPaused = true;
var toShowList = [];
var showTimerDelay = 25;
var isDialogOpen = false;

///////////////////////////////////////////////////////////////////////////////

// Start of Code

restoreSettings();
restoreGameState();
initGetMessage();

window.addEventListener("DOMContentLoaded", function (event) 
{
    license_init("license", "mainpage");
    initStaticStrings();

    titleScreen         = document.getElementById("title_screen");
    helpElem            = document.getElementById("help");
    helpButtonElem      = document.getElementById("help_button");
    settingsButtonElem  = document.getElementById("settings_button");
    easyElem            = document.getElementById("easy");
    mediumElem          = document.getElementById("medium");
    hardElem            = document.getElementById("hard");

    gameScreen          = document.getElementById("game_screen");
    hintButtonElem      = document.getElementById("hint");
    newGameButtonElem   = document.getElementById("new_game");
    playButtonElem      = document.getElementById("play_pause");
    bestScoreElem       = document.getElementById("score");
    settings2ButtonElem = document.getElementById("settings2_button");

    quitConfirmElem     = document.getElementById("newGame");
    quitConfirmYesElem  = document.getElementById("newGame_yes");
    quitConfirmNoElem   = document.getElementById("newGame_no");

    settingsElem        = document.getElementById("settings");
    settingsSoundsElem  = document.getElementById("settings_sounds_val");
    settingsHintsElem   = document.getElementById("settings_hints_val");
    settingsEasyElem    = document.querySelector("#settings_bestTime_easy+.button");
    settingsMediumElem  = document.querySelector("#settings_bestTime_medium+.button");
    settingsHardElem    = document.querySelector("#settings_bestTime_hard+.button");

    themeSound  = new gamesound("audio.theme", true);
    clickSound  = new gamesound("audio.buttonClick");
    hintSound   = new gamesound("audio.hint");
    crunchSound = new gamesound("audio.crunch");
    loseSound   = new gamesound("audio.lose");
    winSound    = new gamesound("audio.win");
    rabbitSound = new gamesound("audio.rabbit");

    setTimeout(function() {
        if (gameInProgress) {
            startGame();
        }
        else {
            titleScreen.classList.add("shown");
        }
        animateCharacters();
    }, 500);

    elemList = document.querySelectorAll(".dialog .close");
    for (var i = 0; i < elemList.length; ++i) {
        elem = elemList[i];
        addButtonEffects(elem, closeDialogCallback);
    }

    addButtonEffects(helpButtonElem, openDialogCallback.bind(undefined, helpElem));
    addButtonEffects(settingsButtonElem, openDialogCallback.bind(undefined, settingsElem));
    addButtonEffects(settings2ButtonElem, openDialogCallback.bind(undefined, settingsElem));
    addButtonEffects(newGameButtonElem, function (event) {
        if (gameInProgress) {
            setPause(true);        
            openDialogCallback(quitConfirmElem);
        }
        else {
            quitGame(event);
        }
    });

    addButtonEffects(easyElem,   startGame.bind(undefined, Rabbit.EASY),   crunchSound);
    addButtonEffects(mediumElem, startGame.bind(undefined, Rabbit.MEDIUM), crunchSound);
    addButtonEffects(hardElem,   startGame.bind(undefined, Rabbit.HARD),   crunchSound);
    addButtonEffects(playButtonElem, togglePause);
    addButtonEffects(quitConfirmYesElem, quitGame);
    addButtonEffects(quitConfirmNoElem, closeDialogCallback);

    addButtonEffects(settingsEasyElem,   clearBestTime.bind(undefined, Rabbit.EASY));
    addButtonEffects(settingsMediumElem, clearBestTime.bind(undefined, Rabbit.MEDIUM));
    addButtonEffects(settingsHardElem,   clearBestTime.bind(undefined, Rabbit.HARD));


    enableHints(useHints);
    var cl = hintButtonElem.classList;
    hintButtonElem.addEventListener("mousedown", function () {
        if (!gameInProgress) return;
        if (!hintEnabled) return;
        cl.add("pressed");
    }, false);
    hintButtonElem.addEventListener("mouseout", function () {
        if (!gameInProgress) return;
        if (!hintEnabled) return;
        cl.remove("pressed");
    }, false);
    hintButtonElem.addEventListener("click", doHint, false);

    updateSettingsStyle(useHints, settingsHintsElem);
    addButtonEffects(settingsHintsElem, function () {
        useHints = !useHints;
        updateSettingsStyle(useHints, settingsHintsElem);
        localStorage.rrr_useHints  = JSON.stringify(useHints);
        enableHints(useHints);
    });

    updateSettingsStyle(useSounds, settingsSoundsElem);
    addButtonEffects(settingsSoundsElem, toggleSounds);

}, false);

var themeSound;
window.addEventListener("load", function (event) 
{
    if (useSounds) {
        themeSound.play();
    }

    scaleBody(document.getElementsByTagName("body")[0], 720);
}, false);

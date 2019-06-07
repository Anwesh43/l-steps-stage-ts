const w : number = window.innerWidth
const h : number = window.innerHeight
const scGap : number = 0.05
const scDiv : number = 0.51
const strokeFactor : number = 90
const sizeFactor : number = 2.9
const foreColor : string = "#0D47A1"
const backColor : string = "#BDBDBD"
const nodes : number = 5
const lines : number = 4

class ScaleUtil {

    static maxValue(scale : number, i : number, n : number) : number {
        return Math.max(0, scale - i / n)
    }
    static divideScale(scale : number, i : number, n : number) : number {
        return Math.min(1 / n, ScaleUtil.maxValue(scale, i, n)) * n
    }

    static scaleFactor(scale : number) : number {
        return Math.floor(scale / scDiv)
    }

    static mirrorValue(scale : number, a : number, b : number) : number {
        const k : number = ScaleUtil.scaleFactor(scale)
        return (1 - k) / a + k / b
    }

    static updateValue(scale : number, dir : number, a : number, b : number) {
        return ScaleUtil.mirrorValue(scale, a, b) * dir * scGap
    }
}

class LStepsStage {

    canvas : HTMLCanvasElement = document.createElement('canvas')
    context : CanvasRenderingContext2D
    renderer : Renderer = new Renderer()

    initCanvas() {
          this.canvas.width = w
          this.canvas.height = h
          this.context = this.canvas.getContext('2d')
          document.body.appendChild(this.canvas)
    }

    render() {
        this.context.fillStyle = backColor
        this.context.fillRect(0, 0, w, h)
        this.renderer.render(this.context)
    }

    handleTap() {
        this.canvas.onmousedown = () => {
            this.renderer.handleTap(() => {
                this.render()
            })
        }
    }

    static init() {
        const stage = new LStepsStage()
        stage.initCanvas()
        stage.render()
        stage.handleTap()
    }
}

class DrawingUtil {

    static drawLine(context : CanvasRenderingContext2D, x1 : number, y1 : number, x2 : number, y2 : number) {
        context.beginPath()
        context.moveTo(x1, y1)
        context.lineTo(x2, y2)
        context.stroke()
    }

    static drawLBars(context : CanvasRenderingContext2D, i : number, scale : number, size : number) {
        const gap : number = (2 * size) / (lines)
        const sc : number = ScaleUtil.divideScale(scale, i, lines)
        context.save()
        context.translate(0, gap * (i + 1))
        DrawingUtil.drawLine(context, 0, 0, gap * (i + 1) * sc, 0)
        context.restore()
    }

    static drawLSNode(context : CanvasRenderingContext2D, i : number, scale : number) {
        const gap : number = w / (nodes + 1)
        const sc1 : number = ScaleUtil.divideScale(scale, 0, 2)
        const sc2 : number = ScaleUtil.divideScale(scale, 1, 2)
        const size : number = gap / sizeFactor
        context.lineCap = 'round'
        context.lineWidth = Math.min(w, h) / strokeFactor
        context.strokeStyle = foreColor
        context.save()
        context.translate(gap * (i + 1), h / 2)
        context.rotate(Math.PI / 2 * sc2)
        context.save()
        context.translate(-size, -size)
        DrawingUtil.drawLine(context, 0, 0, 0, 2 * size)
        for (var i = 0; i < lines; i++) {
            DrawingUtil.drawLBars(context, i, sc1, size)
        }
        context.restore()
        context.restore()
    }
}

class State {

    scale : number = 0
    dir : number = 0
    prevScale : number = 0

    update(cb : Function) {
        this.scale += ScaleUtil.updateValue(this.scale, this.dir, lines, 1)
        if (Math.abs(this.scale - this.prevScale) > 1) {
            this.scale = this.prevScale + this.dir
            this.dir = 0
            this.prevScale = this.scale
            cb()
        }
    }

    startUpdating(cb : Function) {
        if (this.dir == 0) {
            this.dir = 1 - 2 * this.prevScale
            cb()
        }
    }
}

class Animator {

    animated : boolean = false
    interval : number

    start(cb : Function) {
        if (!this.animated) {
            this.animated = true
            this.interval = setInterval(cb, 50)
        }
    }

    stop() {
        if (this.animated) {
            this.animated = false
            clearInterval(this.interval)
        }
    }
}

class LSNode {

    next : LSNode
    prev : LSNode
    state : State = new State()

    constructor(private i : number) {
        this.addNeighbor()
    }

    addNeighbor() {
        if (this.i < nodes - 1) {
            this.next = new LSNode(this.i + 1)
            this.next.prev = this
        }
    }

    draw(context : CanvasRenderingContext2D) {
        DrawingUtil.drawLSNode(context, this.i, this.state.scale)
        if (this.next) {
            this.next.draw(context)
        }
    }

    update(cb : Function) {
        this.state.update(cb)
    }

    startUpdating(cb : Function) {
        this.state.startUpdating(cb)
    }

    getNext(dir : number, cb : Function) : LSNode {
       var curr : LSNode = this.prev
       if (dir == 1) {
          curr = this.next
       }
       if (curr) {
          return curr
       }
       cb()
       return this
    }
}

class LSteps {

    root : LSNode = new LSNode(0)
    curr : LSNode = this.root
    dir : number = 1

    draw(context : CanvasRenderingContext2D) {
        this.root.draw(context)
    }

    update(cb : Function) {
        this.curr.update(() => {
            this.curr = this.curr.getNext(this.dir, () => {
                this.dir *= -1
            })
            cb()
        })
    }

    startUpdating(cb : Function) {
        this.curr.startUpdating(cb)
    }
}

class Renderer {

    ls : LSteps = new LSteps()
    animator : Animator = new Animator()

    render(context : CanvasRenderingContext2D) {
        this.ls.draw(context)
    }

    handleTap(cb : Function) {
        this.ls.startUpdating(() => {
            this.animator.start(() => {
                cb()
                this.ls.update(() => {
                    this.animator.stop()
                    cb()
                })
            })
        })
    }
}

const expandedCommitHeight = 250;

class Branch {
	private vertices: Vertex[];
	private lines: Line[];
	private colour: number;
	private end: number;

	constructor(colour: number) {
		this.vertices = [];
		this.lines = [];
		this.colour = colour;
		this.end = 0;
	}

	public addVertex(vertex: Vertex) {
		this.vertices.push(vertex);
	}
	public addLine(p1: Point, p2: Point, isCommitted: boolean) {
		this.lines.push({ p1: p1, p2: p2, isCommitted: isCommitted });
	}
	public addLines(lines: Line[]) {
		for (let i = 0; i < lines.length; i++) {
			this.lines.push(lines[i]);
		}
	}
	public isMergeOnly() {
		return this.vertices.length === 2 && this.vertices[0].isMerge() && !this.vertices[0].isOnThisBranch(this) && !this.vertices[1].isOnThisBranch(this);
	}
	public simplifyMergeOnly() {
		let lastParent = this.vertices[0].getLastParent();
		if (lastParent === null) return;

		let connectsToBranch = lastParent.getBranch();
		if (connectsToBranch !== null) {
			connectsToBranch.addLines(this.lines);
		}
	}
	public getColour() {
		return this.colour;
	}
	public getEnd() {
		return this.end;
	}
	public setEnd(end: number) {
		this.end = end;
	}
	public draw(svg: SVGElement, config: Config, expandAt: number) {
		this.simplifyVerticalLines();
		let colour = config.graphColours[this.colour % config.graphColours.length], i, x1, y1, x2, y2;
		for (i = 0; i < this.lines.length; i++) {
			x1 = this.lines[i].p1.x * config.grid.x + config.grid.offsetX;
			y1 = this.lines[i].p1.y * config.grid.y + config.grid.offsetY;
			x2 = this.lines[i].p2.x * config.grid.x + config.grid.offsetX;
			y2 = this.lines[i].p2.y * config.grid.y + config.grid.offsetY;
			if (expandAt > -1) {
				if (this.lines[i].p1.y > expandAt) {
					y1 += expandedCommitHeight; y2 += expandedCommitHeight;
				} else if (this.lines[i].p2.y > expandAt) {
					if (x1 < x2) {
						this.drawLine(svg, x2, y1 + config.grid.y, x2, y2 + expandedCommitHeight, this.lines[i].isCommitted ? colour : '#808080', config);
					} else if (x1 > x2) {
						this.drawLine(svg, x1, y1, x1, y2 - config.grid.y + expandedCommitHeight, this.lines[i].isCommitted ? colour : '#808080', config);
						y1 += expandedCommitHeight; y2 += expandedCommitHeight;
					} else {
						y2 += expandedCommitHeight;
					}
				}
			}
			this.drawLine(svg, x1, y1, x2, y2, this.lines[i].isCommitted ? colour : '#808080', config);
		}
	}
	private drawLine(svg: SVGElement, x1: number, y1: number, x2: number, y2: number, colour: string, config: Config) {
		let line1 = document.createElementNS('http://www.w3.org/2000/svg', 'path'), line2 = document.createElementNS('http://www.w3.org/2000/svg', 'path'), path;
		if (x1 === x2) {
			path = 'M ' + x1 + ' ' + y1 + ' L ' + x2 + ' ' + y2;
		} else {
			if (config.graphStyle === 'angular') {
				path = 'M ' + x1 + ' ' + y1 + ' L ' + (x1 < x2 ? (x2 + ' ' + (y2 - config.grid.y * 0.38)) : (x1 + ' ' + (y1 + config.grid.y * 0.38))) + ' L ' + x2 + ' ' + y2;
			} else {
				path = 'M ' + x1 + ' ' + y1 + ' C ' + x1 + ' ' + (y1 + config.grid.y * 0.8) + ' ' + x2 + ' ' + (y2 - config.grid.y * 0.8) + ' ' + x2 + ' ' + y2;
			}
		}

		line1.setAttribute('class', 'shaddow');
		line1.setAttribute('d', path);
		svg.appendChild(line1);

		line2.setAttribute('class', 'line');
		line2.setAttribute('d', path);
		line2.setAttribute('stroke', colour);
		svg.appendChild(line2);
	}
	private simplifyVerticalLines() {
		let i = 0;
		while (i < this.lines.length - 1) {
			if (this.lines[i].p1.x === this.lines[i].p2.x && this.lines[i].p2.x === this.lines[i + 1].p1.x && this.lines[i + 1].p1.x === this.lines[i + 1].p2.x && this.lines[i].p2.y === this.lines[i + 1].p1.y && this.lines[i].isCommitted === this.lines[i + 1].isCommitted) {
				this.lines[i].p2.y = this.lines[i + 1].p2.y;
				this.lines.splice(i + 1, 1);
			} else {
				i++;
			}
		}
	}
}

class Vertex {
	private x: number;
	private y: number;
	private parents: Vertex[];
	private nextParent: number;
	private onBranch: Branch | null;
	private isCommitted: boolean;
	private isCurrent: boolean;
	private nextX: number;

	constructor(y: number, isCommitted: boolean, isCurrent: boolean) {
		this.x = 0;
		this.y = y;
		this.parents = [];
		this.nextParent = 0;
		this.onBranch = null;
		this.isCommitted = isCommitted;
		this.isCurrent = isCurrent;
		this.nextX = 0;
	}

	public addParent(vertex: Vertex) {
		this.parents.push(vertex);
	}
	public hasParents() {
		return this.parents.length > 0;
	}
	public getNextParent(): Vertex | null {
		if (this.nextParent < this.parents.length) return this.parents[this.nextParent];
		return null;
	}
	public getLastParent(): Vertex | null {
		if (this.nextParent < 1) return null;
		return this.parents[this.nextParent - 1];
	}
	public registerParentProcessed() {
		this.nextParent++;
	}
	public isMerge() {
		return this.parents.length > 1;
	}

	public addToBranch(branch: Branch, x: number) {
		branch.addVertex(this);
		if (this.onBranch === null) {
			this.onBranch = branch;
			this.x = x;
		}
	}
	public isNotOnBranch() {
		return this.onBranch === null;
	}
	public isOnThisBranch(branch: Branch) {
		return this.onBranch === branch;
	}
	public getBranch() {
		return this.onBranch;
	}

	public getPoint(): Point {
		return { x: this.x, y: this.y };
	}
	public getNextPoint(): Point {
		return { x: this.nextX, y: this.y };
	}
	public getIsCommitted() {
		return this.isCommitted;
	}
	public setNextX(x: number) {
		if (x > this.nextX) this.nextX = x;
	}

	public getColour() {
		return this.onBranch !== null ? this.onBranch.getColour() : 0;
	}
	public draw(svg: SVGElement, config: Config, expandOffset: boolean) {
		if (this.onBranch === null) return;

		let circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
		let colour = this.isCommitted ? config.graphColours[this.onBranch.getColour() % config.graphColours.length] : '#808080';
		circle.setAttribute('cx', (this.x * config.grid.x + config.grid.offsetX).toString());
		circle.setAttribute('cy', (this.y * config.grid.y + config.grid.offsetY + (expandOffset ? expandedCommitHeight : 0)).toString());
		circle.setAttribute('r', '4');
		if (this.isCurrent) {
			circle.setAttribute('class', 'current');
			circle.setAttribute('stroke', colour);
		} else {
			circle.setAttribute('fill', colour);
		}

		svg.appendChild(circle);
	}
}

class Graph {
	private elem: HTMLElement;
	private config: Config;

	private vertices: Vertex[] = [];
	private branches: Branch[] = [];
	private availableColours: number[] = [];

	constructor(id: string, config: Config) {
		this.elem = document.getElementById(id)!;
		this.config = config;
	}

	public loadCommits(commits: GG.GitCommitNode[], commitLookup: { [hash: string]: number }) {
		this.vertices = [];
		this.branches = [];
		this.availableColours = [];

		let i: number, j: number;
		for (i = 0; i < commits.length; i++) {
			this.vertices.push(new Vertex(i, commits[i].hash !== '*', commits[i].current));
		}
		for (i = 0; i < commits.length; i++) {
			for (j = 0; j < commits[i].parentHashes.length; j++) {
				if (typeof commitLookup[commits[i].parentHashes[j]] === 'number') {
					this.vertices[i].addParent(this.vertices[commitLookup[commits[i].parentHashes[j]]]);
				}
			}
		}

		while ((i = this.findStart()) !== -1) {
			this.determinePath(i);
		}
	}

	public render(expandedCommit: ExpandedCommit | null) {
		let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), i;
		svg.setAttribute('width', this.getWidth().toString());
		svg.setAttribute('height', this.getHeight(expandedCommit).toString());

		for (i = 0; i < this.branches.length; i++) {
			this.branches[i].draw(svg, this.config, expandedCommit !== null ? expandedCommit.id : -1);
		}
		for (i = 0; i < this.vertices.length; i++) {
			this.vertices[i].draw(svg, this.config, expandedCommit !== null && i > expandedCommit.id);
		}

		this.clear();
		this.elem.appendChild(svg);
	}

	public clear() {
		if (this.elem.firstChild) {
			this.elem.removeChild(this.elem.firstChild);
		}
	}

	public getWidth() {
		let x = 0, i, p;
		for (i = 0; i < this.vertices.length; i++) {
			p = this.vertices[i].getNextPoint();
			if (p.x > x) x = p.x;
		}
		return x * this.config.grid.x;
	}

	public getHeight(expandedCommit: ExpandedCommit | null) {
		return this.vertices.length * this.config.grid.y + (expandedCommit !== null ? expandedCommitHeight : 0);
	}

	public getVertexColour(v: number) {
		return this.vertices[v].getColour();
	}

	private determinePath(startAt: number) {
		let i = startAt;
		let branch = new Branch(this.getAvailableColour(startAt));
		let vertex = this.vertices[i], parentVertex = this.vertices[i].getNextParent();
		let lastPoint = vertex.isNotOnBranch() ? vertex.getNextPoint() : vertex.getPoint(), curPoint;

		vertex.setNextX(lastPoint.x + 1);
		vertex.addToBranch(branch, lastPoint.x);
		for (i = startAt + 1; i < this.vertices.length; i++) {
			curPoint = parentVertex === this.vertices[i] && !parentVertex.isNotOnBranch() ? this.vertices[i].getPoint() : this.vertices[i].getNextPoint();
			branch.addLine(lastPoint, curPoint, vertex.getIsCommitted());
			lastPoint = curPoint;
			this.vertices[i].setNextX(curPoint.x + 1);

			if (parentVertex === this.vertices[i]) {
				vertex.registerParentProcessed();
				let parentVertexOnBranch = !parentVertex.isNotOnBranch();
				parentVertex.addToBranch(branch, curPoint.x);
				vertex = parentVertex;
				parentVertex = vertex.getNextParent();
				if (parentVertexOnBranch) break;
			}
		}
		branch.setEnd(i);

		if (branch.isMergeOnly()) {
			branch.simplifyMergeOnly();
		} else {
			this.branches.push(branch);
			this.availableColours[branch.getColour()] = branch.getEnd();
		}
	}

	private findStart() {
		for (let i = 0; i < this.vertices.length; i++) {
			if (this.vertices[i].getNextParent() !== null || this.vertices[i].isNotOnBranch()) return i;
		}
		return -1;
	}

	private getAvailableColour(startAt: number) {
		for (let i = 0; i < this.availableColours.length; i++) {
			if (startAt > this.availableColours[i]) {
				return i;
			}
		}
		this.availableColours.push(0);
		return this.availableColours.length - 1;
	}
}
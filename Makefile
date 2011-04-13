JS_SRC= \
	js/canvas.js \
	js/graph.js \
	js/graphviewer.js

OUTPUT=xm_compiled.js

JSCFLAGS="--compilation_level=ADVANCED_OPTIMIZATIONS"

all:$(OUTPUT)

deps: $(JS_SRC)
	python libs/closure-library/closure/bin/build/depswriter.py \
	  --root_with_prefix="js ../../../../js" \
	> xm-deps.js

xm_compiled.js: $(JS_SRC)
	python libs/closure-library/closure/bin/build/closurebuilder.py \
	  --root=libs/closure-library/ \
	  --root=js/ \
	  --namespace="xeme.ui.GraphViewer" \
	  --namespace="xeme.coloring.Graph" \
	  --namespace="xeme.draw.Canvas" \
	  --output_mode=compiled \
      --compiler_flags="$(JSCFLAGS)" \
	  --compiler_jar=$(HOME)/bin/compiler.jar > $@

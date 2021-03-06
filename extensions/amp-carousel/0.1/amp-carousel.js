/**
 * Copyright 2015 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {SwipeXRecognizer} from '../../../src/swipe';
import {Animation} from '../../../src/animation';
import {Layout} from '../../../src/layout';
import * as st from '../../../src/style';
import * as tr from '../../../src/transition';


(window.AMP = window.AMP || []).push(function(AMP) {
  class AmpCarousel extends AMP.BaseElement {

    /** @override */
    isLayoutSupported(layout) {
      return layout == Layout.FIXED;
    }

    /** @override */
    firstAttachedCallback() {
      /** @private {number} */
      this.pos_ = 0;

      /** @private {!Array<!Element>} */
      this.cells_ = this.getRealChildren();

      /** @private {!Element} */
      this.container_ = document.createElement('div');
      st.setStyles(this.container_, {
        whiteSpace: 'nowrap',
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0
      });
      this.element.appendChild(this.container_);

      this.cells_.forEach((cell) => {
        cell.style.display = 'inline-block';
        if (cell != this.cells_[0]) {
          // TODO(dvoytenko): this has to be customizable
          cell.style.marginLeft = '8px';
        }
        this.container_.appendChild(cell);
      });

      /** @private @const */
      this.swipeX_ = new SwipeXRecognizer(this.element);

      this.swipeX_.onStart((e) => {
        let containerWidth = this.element.offsetWidth;
        let scrollWidth = this.container_.scrollWidth;
        let maxPos = Math.max(scrollWidth - containerWidth, 0);
        let minDelta = this.pos_ - maxPos;
        let maxDelta = this.pos_;
        let overshoot = Math.min(containerWidth * 0.4, 200);
        this.swipeX_.setPositionOffset(this.pos_);
        this.swipeX_.setPositionMultiplier(-1);
        this.swipeX_.setBounds(minDelta, maxDelta, overshoot);
        this.swipeX_.continueMotion(/* snap point */ 0,
            /* stop on touch */ true);
      });
      this.swipeX_.onMove((e) => {
        this.pos_ = e.position;
        st.setStyles(this.container_, {
          transform: st.translateX(-this.pos_)
        });
        if (e.velocity < 0.05) {
          this.preload_(this.pos_);
        }
      });
      this.swipeX_.onEnd((e) => {
        this.pos_ = e.position;
        this.commitSwitch_(e.startPosition, this.pos_);
      });

      // TODO(dvoytenko): move to CSS
      this.prevButton_ = document.createElement('button');
      this.prevButton_.textContent = '\u276E';
      this.prevButton_.style.opacity = 0.6;
      this.prevButton_.style.position = 'absolute';
      this.prevButton_.style.zIndex = 10;
      this.prevButton_.style.left = '16px';
      this.prevButton_.style.top = '50%';
      this.prevButton_.style.padding = '8px';
      this.prevButton_.style.fontSize = '24px';
      this.prevButton_.style.marginTop = '-20px';
      this.prevButton_.style.pointerEvents = 'all';
      this.prevButton_.onclick = () => {
        this.go(-1, true);
      };
      this.element.appendChild(this.prevButton_);

      this.nextButton_ = document.createElement('button');
      this.nextButton_.textContent = '\u276F';
      this.nextButton_.style.opacity = 0.6;
      this.nextButton_.style.position = 'absolute';
      this.nextButton_.style.zIndex = 10;
      this.nextButton_.style.right = '16px';
      this.nextButton_.style.top = '50%';
      this.nextButton_.style.padding = '8px';
      this.nextButton_.style.fontSize = '24px';
      this.nextButton_.style.marginTop = '-20px';
      this.nextButton_.style.pointerEvents = 'all';
      this.nextButton_.onclick = () => {
        this.go(1, true);
      };
      this.element.appendChild(this.nextButton_);
    }

    /** @override */
    loadContent() {
      this.preload_(this.pos_);
      this.preloadNext_(this.pos_);
      return Promise.resolve();
    }

    /** @override */
    activateContent() {
      // TODO(dvoytenko): control active/inactive state within the visible items
    }

    /** @override */
    deactivateContent() {
    }

    /**
     * Proceeds to the next slide in the desired direction.
     * @param {number} dir -1 or 1
     * @param {boolean} animate
     */
    go(dir, animate) {
      var newPos = this.nextPos_(dir);
      if (newPos != this.pos_) {
        var oldPos = this.pos_;
        this.pos_ = newPos;

        this.preload_(newPos);
        this.preloadNext_(dir);

        var containerWidth = this.element.offsetWidth;
        if (!animate) {
          this.commitSwitch_(oldPos, newPos);
        } else {
          Animation.animate(tr.setStyles(this.container_, {
            transform: tr.translateX(tr.numeric(-oldPos, -newPos))
          }), 200, 'ease-out').thenAlways(() => {
            this.commitSwitch_(oldPos, newPos);
          });
        }
      }
    }

    /**
     * @param {number} oldPos
     * @param {number} newPos
     * @private
     */
    commitSwitch_(oldPos, newPos) {
      st.setStyles(this.container_, {
        transform: st.translateX(-newPos)
      });
      // TODO(dvoytenko): do these strictly via Resources.
      // TODO(dvoytenko): old/new can overlap. don't do extra steps.
      this.withinWindow_(oldPos, (cell) => {
        if (cell.deactivateContentCallback) {
          cell.deactivateContentCallback();
        }
      });
      this.withinWindow_(newPos, (cell) => {
        if (cell.activateContentCallback) {
          cell.activateContentCallback();
        }
      });
    }

    /**
     * @param {number} dir
     * @private
     */
    nextPos_(dir) {
      let containerWidth = this.element.offsetWidth;
      let fullWidth = this.container_.scrollWidth;
      let newPos = this.pos_ + dir * containerWidth;
      if (newPos < 0) {
        return 0;
      }
      if (fullWidth >= containerWidth &&
              newPos > fullWidth - containerWidth) {
        return fullWidth - containerWidth;
      }
      return newPos;
    }

    /**
     * @param {number} pos
     * @param {function()} callback
     * @private
     */
    withinWindow_(pos, callback) {
      let containerWidth = this.element.offsetWidth;
      for (let i = 0; i < this.cells_.length; i++) {
        let cell = this.cells_[i];
        if (cell.offsetLeft + cell.offsetWidth >= pos &&
              cell.offsetLeft <= pos + containerWidth) {
          callback(cell);
        }
      }
    }

    /**
     * @param {number} pos
     * @private
     */
    preload_(pos) {
      this.withinWindow_(pos, (cell) => {
        // TODO(dvoytenko): do this strictly via Resources. In particular this
        // code will currently cause double-loadings and other problems.
        if (cell.initiateLoadContent) {
          cell.initiateLoadContent();
        }
      });
    }

    /**
     * @param {number} dir
     * @private
     */
    preloadNext_(dir) {
      var nextPos = this.nextPos_(dir);
      if (nextPos != this.pos_) {
        this.preload_(nextPos);
      }
    }
  }

  AMP.registerElement('amp-carousel', AmpCarousel);
});

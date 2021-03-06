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

import {createIframe} from '../../../../testing/iframe';
require('../../../../build/all/v0/amp-fit-text-0.1.max');
import {adopt} from '../../../../src/runtime';

adopt(window);

describe('amp-fit-text', () => {

  function getFitText(text, opt_responsive) {
    var iframe = createIframe();
    var ft = iframe.doc.createElement('amp-fit-text');
    ft.setAttribute('width', '111');
    ft.setAttribute('height', '222');
    if (opt_responsive) {
      ft.setAttribute('layout', 'responsive');
    }
    ft.textContent = text;
    iframe.doc.body.appendChild(ft);
    ft.implementation_.loadContent();
    return ft;
  }

  it('renders', () => {
    var text = 'Lorem ipsum';
    var ft = getFitText(text);
    var content = ft.querySelector('.-amp-fit-text-content');
    expect(content).to.not.equal(null);
    expect(content.textContent).to.equal(text);
    expect(content.style.fontSize).to.equal('6px');
  });

});

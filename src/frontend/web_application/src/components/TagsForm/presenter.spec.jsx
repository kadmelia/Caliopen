import React from 'react';
import { shallow } from 'enzyme';
import TagsForm from './presenter';

describe('component TagsForm', () => {
  it('render', () => {
    const noop = str => str;
    const comp = shallow(
      <TagsForm onCreate={noop} onUpdate={noop} />
    );

    expect(comp.find('FormGrid').length).toEqual(1);
  });
});

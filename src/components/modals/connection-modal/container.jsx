import styled, { css } from "styled-components";

const ModalContainer = styled.div`
  width: 100%;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;

  h1 {
    text-align: center;
    font-weight: bold;
    font-size: 24px;
    line-height: 110%;
    color: ${(props) => props.theme.colors.secondaryWhite};
    margin: 0 0 20px 0;
  }

  p {
    text-align: center;
  }

  .buttons-container {
    display: flex;
    margin: 20px 0 0 0;
    justify-content: space-evenly;
    width: 100%;
    flex-wrap: wrap;

    button {
      width: 220px;
    }
  }
`;

export default ModalContainer;
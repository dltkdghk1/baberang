import React from 'react';
import styled, { keyframes } from 'styled-components';

interface LoadingAnimationProps {
  message?: string;
  type?: 'menu' | 'report';
}

const bounce = keyframes`
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-15px);
  }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
`;

const ImageContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
`;

interface FoodImageProps {
  delay: number;
}

const FoodImage = styled.img<FoodImageProps>`
  width: 50px;
  height: 50px;
  animation: ${bounce} 1.5s infinite ease-in-out;
  animation-delay: ${(props) => props.delay}s;
`;

const Message = styled.div`
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-top: 10px;
`;

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
  message = '식단 생성중...',
  type = 'menu',
}) => {
  const renderImages = () => {
    if (type === 'report') {
      return (
        <>
          <FoodImage src="/images/items/loading5.png" alt="음식 5" delay={0} />
          <FoodImage src="/images/items/loading6.png" alt="음식 6" delay={0.2} />
          <FoodImage src="/images/items/loading7.png" alt="음식 7" delay={0.4} />
          <FoodImage src="/images/items/loading8.png" alt="음식 8" delay={0.6} />
        </>
      );
    }

    return (
      <>
        <FoodImage src="/images/items/loading1.png" alt="음식 1" delay={0} />
        <FoodImage src="/images/items/loading2.png" alt="음식 2" delay={0.2} />
        <FoodImage src="/images/items/loading3.png" alt="음식 3" delay={0.4} />
        <FoodImage src="/images/items/loading4.png" alt="음식 4" delay={0.6} />
      </>
    );
  };

  return (
    <Container>
      <ImageContainer>{renderImages()}</ImageContainer>
      <Message>{message}</Message>
    </Container>
  );
};

export default LoadingAnimation;
